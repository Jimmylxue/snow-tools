import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { app, ipcMain } from 'electron'
import type {
	TUpyunConfigState,
	TUpyunSavePayload,
	TUpyunSaveResult,
	TUpyunUploadPayload,
	TUpyunUploadResult,
} from './type'

type TUpyunConfig = {
	bucket: string
	operator: string
	password: string
	domain: string
	directory: string
}

const API_HOST = 'https://v0.api.upyun.com'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const UPLOAD_TIMEOUT = 60000
const BUCKET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/
const DIRECTORY_PATTERN = /^[A-Za-z0-9/_-]+$/
const IMAGE_EXTENSIONS = new Set([
	'jpg',
	'jpeg',
	'png',
	'gif',
	'webp',
	'svg',
	'bmp',
	'avif',
])
const MIME_EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/jpg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp',
	'image/svg+xml': 'svg',
	'image/bmp': 'bmp',
	'image/avif': 'avif',
}

let initialized = false

function configPath() {
	return path.join(app.getPath('userData'), 'upyun.json')
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function normalizeDirectory(input: string | undefined) {
	const trimmed = (input ?? '')
		.trim()
		.replace(/^\/+|\/+$/g, '')
		.replace(/\/+/g, '/')

	return trimmed || 'snowtools'
}

function isValidDirectory(directory: string) {
	return (
		DIRECTORY_PATTERN.test(directory) &&
		directory
			.split('/')
			.every(part => !!part && part !== '.' && part !== '..')
	)
}

function normalizeDomain(input: string | undefined, bucket: string) {
	const trimmed = (input ?? '').trim().replace(/\/+$/, '')
	if (!trimmed) return `https://${bucket}.b0.upaiyun.com`

	const withScheme = /^https?:\/\//i.test(trimmed)
		? trimmed
		: `https://${trimmed}`
	const url = new URL(withScheme)
	return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
}

async function readConfig(): Promise<TUpyunConfig | null> {
	try {
		const raw = await fs.readFile(configPath(), 'utf8')
		const data: unknown = JSON.parse(raw)
		if (!isRecord(data)) return null

		const bucket =
			typeof data.bucket === 'string' ? data.bucket.trim() : ''
		const operator =
			typeof data.operator === 'string' ? data.operator.trim() : ''
		const password =
			typeof data.password === 'string' ? data.password.trim() : ''
		if (!bucket || !operator || !password) return null

		const directory = normalizeDirectory(
			typeof data.directory === 'string' ? data.directory : '',
		)
		let domain: string
		try {
			domain = normalizeDomain(
				typeof data.domain === 'string' ? data.domain : '',
				bucket,
			)
		} catch {
			domain = `https://${bucket}.b0.upaiyun.com`
		}

		return {
			bucket,
			operator,
			password,
			domain,
			directory: isValidDirectory(directory)
				? directory
				: 'snowtools',
		}
	} catch {
		return null
	}
}

async function getConfigState(): Promise<TUpyunConfigState> {
	const config = await readConfig()
	return {
		configured: !!config,
		bucket: config?.bucket ?? '',
		operator: config?.operator ?? '',
		domain: config?.domain ?? '',
		directory: config?.directory ?? 'snowtools',
	}
}

async function saveConfig(
	payload: TUpyunSavePayload,
): Promise<TUpyunSaveResult> {
	if (
		!payload ||
		typeof payload.bucket !== 'string' ||
		typeof payload.operator !== 'string'
	) {
		return { ok: false, message: '配置参数不完整' }
	}

	const bucket = payload.bucket.trim()
	const operator = payload.operator.trim()
	if (!BUCKET_PATTERN.test(bucket)) {
		return { ok: false, message: '服务名只能包含字母、数字、下划线和短横线' }
	}
	if (!operator) {
		return { ok: false, message: '请输入操作员名称' }
	}

	const directory = normalizeDirectory(payload.directory)
	if (!isValidDirectory(directory)) {
		return {
			ok: false,
			message: '存储目录只能包含字母、数字、/、_、-',
		}
	}

	let domain: string
	try {
		domain = normalizeDomain(payload.domain, bucket)
	} catch {
		return { ok: false, message: '访问域名格式不正确' }
	}

	const existing = await readConfig()
	const providedSecret =
		typeof payload.secret === 'string' ? payload.secret.trim() : ''

	if (
		!providedSecret &&
		existing &&
		(existing.bucket !== bucket || existing.operator !== operator)
	) {
		return { ok: false, message: '更换服务名或操作员时需要重新输入密码' }
	}

	const password = providedSecret || existing?.password || ''
	if (!password) return { ok: false, message: '请输入操作员密码' }

	try {
		await fs.mkdir(path.dirname(configPath()), { recursive: true })
		await fs.writeFile(
			configPath(),
			JSON.stringify(
				{ bucket, operator, password, domain, directory },
				null,
				2,
			),
			{ mode: 0o600 },
		)
		await fs.chmod(configPath(), 0o600).catch(() => {})
		return { ok: true }
	} catch {
		return { ok: false, message: '保存又拍云配置失败' }
	}
}

async function clearConfig(): Promise<TUpyunSaveResult> {
	try {
		await fs.rm(configPath(), { force: true })
		return { ok: true }
	} catch {
		return { ok: false, message: '清除又拍云配置失败' }
	}
}

function toBuffer(data: TUpyunUploadPayload['data']) {
	if (data instanceof ArrayBuffer) return Buffer.from(data)
	if (ArrayBuffer.isView(data)) {
		return Buffer.from(data.buffer, data.byteOffset, data.byteLength)
	}
	return null
}

function getImageExtension(fileName: string, mimeType: string) {
	const nameExtension = path.extname(fileName).replace('.', '').toLowerCase()
	const normalized =
		nameExtension === 'jpeg' ? 'jpg' : nameExtension

	if (IMAGE_EXTENSIONS.has(normalized)) return normalized
	return MIME_EXTENSIONS[mimeType] ?? ''
}

function uploadErrorMessage(status: number, body: string) {
	if (status === 401) {
		return '又拍云鉴权失败，请检查服务名、操作员和密码'
	}
	if (status === 403) {
		return '又拍云拒绝上传，请检查操作员权限'
	}
	if (status === 404) {
		return '又拍云服务不存在，请检查服务名'
	}
	if (status === 413) {
		return '图片超过又拍云的上传大小限制'
	}

	const detail = body.trim().slice(0, 200)
	return `又拍云上传失败（HTTP ${status}）${detail ? `：${detail}` : ''}`
}

async function uploadImage(
	payload: TUpyunUploadPayload,
): Promise<TUpyunUploadResult> {
	if (
		!payload ||
		typeof payload.fileName !== 'string' ||
		typeof payload.mimeType !== 'string'
	) {
		return { ok: false, message: '上传参数不完整' }
	}

	const config = await readConfig()
	if (!config) {
		return { ok: false, message: '请先在设置 → 图床中配置又拍云' }
	}

	const buffer = toBuffer(payload.data)
	if (!buffer || buffer.length === 0) {
		return { ok: false, message: '图片内容为空' }
	}
	if (buffer.length > MAX_IMAGE_BYTES) {
		return { ok: false, message: '图片不能超过 10MB' }
	}

	const extension = getImageExtension(
		payload.fileName,
		payload.mimeType,
	)
	if (!extension) {
		return { ok: false, message: '只能上传常见的图片格式' }
	}

	const contentType = payload.mimeType.startsWith('image/')
		? payload.mimeType
		: `image/${extension === 'jpg' ? 'jpeg' : extension}`
	const now = new Date()
	const datePath = `${now.getFullYear()}/${String(
		now.getMonth() + 1,
	).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
	const remotePath = `${config.directory}/${datePath}/${crypto.randomUUID()}.${extension}`
	const uri = `/${config.bucket}/${remotePath}`
	const date = now.toUTCString()

	const passwordMd5 = crypto
		.createHash('md5')
		.update(config.password)
		.digest('hex')
	const signature = crypto
		.createHmac('sha1', passwordMd5)
		.update(`PUT&${uri}&${date}`)
		.digest('base64')

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT)
	let response: Response

	try {
		response = await fetch(`${API_HOST}${uri}`, {
			method: 'PUT',
			headers: {
				Authorization: `UPYUN ${config.operator}:${signature}`,
				Date: date,
				'Content-Type': contentType,
				'Content-Length': String(buffer.length),
			},
			body: buffer,
			signal: controller.signal,
		})
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			return { ok: false, message: '上传超时，请重试' }
		}
		return { ok: false, message: '无法连接又拍云，请检查网络' }
	} finally {
		clearTimeout(timer)
	}

	if (!response.ok) {
		const body = await response.text().catch(() => '')
		return {
			ok: false,
			message: uploadErrorMessage(response.status, body),
		}
	}

	return {
		ok: true,
		url: `${config.domain}/${remotePath}`,
		path: remotePath,
	}
}

export function initUpyun() {
	if (initialized) return
	initialized = true

	ipcMain.handle('UPYUN_GET_CONFIG', () => getConfigState())

	ipcMain.handle(
		'UPYUN_SAVE_CONFIG',
		(_, payload: TUpyunSavePayload) => saveConfig(payload),
	)

	ipcMain.handle('UPYUN_CLEAR_CONFIG', () => clearConfig())

	ipcMain.handle(
		'UPYUN_UPLOAD',
		(_, payload: TUpyunUploadPayload) => uploadImage(payload),
	)
}
