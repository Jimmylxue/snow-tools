import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { app, ipcMain } from 'electron'
import type {
	TBaiduTranslateConfigState,
	TBaiduTranslateIpcResult,
	TBaiduTranslateParams,
	TBaiduTranslateResult,
	TBaiduTranslateSavePayload,
	TBaiduTranslateSaveResult,
} from './type'

type TCredentials = {
	appId: string
	secret: string
}

type TBaiduResponse = {
	from?: string
	to?: string
	error_code?: string | number
	error_msg?: string
	trans_result?: Array<{ src?: string; dst?: string }>
}

const BAIDU_ENDPOINT = 'https://fanyi-api.baidu.com/api/trans/vip/translate'
const MAX_QUERY_BYTES = 6000
const REQUEST_TIMEOUT = 20000

const BAIDU_ERRORS: Record<string, string> = {
	'52001': '翻译服务超时，请重试',
	'52002': '翻译服务异常，请稍后重试',
	'52003': 'AppID 或密钥不正确，请检查设置',
	'54000': '翻译参数不完整',
	'54001': '签名错误，请检查 AppID 和密钥是否匹配',
	'54003': '请求过于频繁，请稍后再试',
	'54004': '百度翻译账户余额不足',
	'54005': '长文本请求过于频繁，请稍后再试',
	'58000': '当前 IP 不在百度翻译白名单中，请在控制台清空服务器地址或加入当前 IP',
	'58001': '不支持该语言方向',
	'58002': '翻译服务已关闭',
	'90107': '认证未通过或未生效',
}

let initialized = false

function configPath() {
	return path.join(app.getPath('userData'), 'baidu-translate.json')
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

async function readCredentials(): Promise<TCredentials | null> {
	try {
		const raw = await fs.readFile(configPath(), 'utf8')
		const data: unknown = JSON.parse(raw)
		if (!isRecord(data)) return null

		const appId = typeof data.appId === 'string' ? data.appId.trim() : ''
		const secret =
			typeof data.secret === 'string' ? data.secret.trim() : ''
		if (!appId || !secret) return null

		return { appId, secret }
	} catch {
		return null
	}
}

async function getConfigState(): Promise<TBaiduTranslateConfigState> {
	const credentials = await readCredentials()
	return {
		configured: !!credentials,
		appId: credentials?.appId ?? '',
	}
}

async function saveConfig(
	payload: TBaiduTranslateSavePayload,
): Promise<TBaiduTranslateSaveResult> {
	if (!payload || typeof payload.appId !== 'string') {
		return { ok: false, message: 'AppID 格式不正确' }
	}

	const appId = payload.appId.trim()
	if (!appId) return { ok: false, message: '请输入 AppID' }

	const existing = await readCredentials()
	const providedSecret =
		typeof payload.secret === 'string' ? payload.secret.trim() : ''

	if (
		!providedSecret &&
		existing &&
		existing.appId !== appId
	) {
		return { ok: false, message: '更换 AppID 时需要重新输入密钥' }
	}

	const secret = providedSecret || existing?.secret || ''
	if (!secret) return { ok: false, message: '请输入密钥' }

	try {
		await fs.mkdir(path.dirname(configPath()), { recursive: true })
		await fs.writeFile(
			configPath(),
			JSON.stringify({ appId, secret }, null, 2),
			{ mode: 0o600 },
		)
		await fs.chmod(configPath(), 0o600).catch(() => {})
		return { ok: true }
	} catch {
		return { ok: false, message: '保存翻译配置失败' }
	}
}

async function clearConfig(): Promise<TBaiduTranslateSaveResult> {
	try {
		await fs.rm(configPath(), { force: true })
		return { ok: true }
	} catch {
		return { ok: false, message: '清除翻译配置失败' }
	}
}

function baiduErrorMessage(code: string, fallback: string) {
	return (
		BAIDU_ERRORS[code] ||
		(fallback ? `翻译失败：${fallback}` : `翻译失败（错误码 ${code}）`)
	)
}

async function translateText(
	params: TBaiduTranslateParams,
): Promise<TBaiduTranslateResult> {
	if (!params || typeof params.q !== 'string') {
		throw new Error('翻译参数不完整')
	}

	const original = params.q
	const q = original.trim()
	if (!q) throw new Error('请输入要翻译的内容')
	if (Buffer.byteLength(q, 'utf8') > MAX_QUERY_BYTES) {
		throw new Error('单次翻译不能超过 6000 字节')
	}

	const credentials = await readCredentials()
	if (!credentials) {
		throw new Error('请先在设置中配置百度翻译 AppID 和密钥')
	}

	const salt = String(Date.now())
	const sign = crypto
		.createHash('md5')
		.update(credentials.appId + q + salt + credentials.secret)
		.digest('hex')

	const body = new URLSearchParams({
		q,
		from: params.from,
		to: params.to,
		appid: credentials.appId,
		salt,
		sign,
	})

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
	let response: Response

	try {
		response = await fetch(BAIDU_ENDPOINT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body,
			signal: controller.signal,
		})
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error('翻译请求超时，请重试')
		}
		throw new Error('无法连接百度翻译服务，请检查网络')
	} finally {
		clearTimeout(timer)
	}

	if (!response.ok) {
		throw new Error(`百度翻译请求失败（HTTP ${response.status}）`)
	}

	let data: TBaiduResponse
	try {
		data = (await response.json()) as TBaiduResponse
	} catch {
		throw new Error('百度翻译返回了无法解析的数据')
	}

	const errorCode =
		data.error_code === undefined || data.error_code === null
			? ''
			: String(data.error_code)
	if (errorCode) {
		throw new Error(
			baiduErrorMessage(errorCode, data.error_msg ?? ''),
		)
	}

	const results = (data.trans_result ?? []).filter(
		(item): item is { src: string; dst: string } =>
			typeof item?.src === 'string' && typeof item?.dst === 'string',
	)
	if (!results.length) {
		throw new Error('百度翻译没有返回结果')
	}

	return {
		from: data.from ?? params.from,
		to: data.to ?? params.to,
		trans_result: [
			{
				src: original,
				dst: results.map(item => item.dst).join('\n'),
			},
		],
	}
}

export function initTranslate() {
	if (initialized) return
	initialized = true

	ipcMain.handle(
		'TRANSLATE_TEXT',
		async (_, params: TBaiduTranslateParams): Promise<TBaiduTranslateIpcResult> => {
			try {
				return { ok: true, data: await translateText(params) }
			} catch (error) {
				return {
					ok: false,
					message:
						error instanceof Error ? error.message : '翻译失败',
				}
			}
		},
	)

	ipcMain.handle('TRANSLATE_GET_CONFIG', () => getConfigState())

	ipcMain.handle(
		'TRANSLATE_SAVE_CONFIG',
		(_, payload: TBaiduTranslateSavePayload) => saveConfig(payload),
	)

	ipcMain.handle('TRANSLATE_CLEAR_CONFIG', () => clearConfig())
}
