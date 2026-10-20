import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { app, ipcMain } from 'electron'
import type {
	TSpotlightShortcutResult,
	TSpotlightShortcutState,
} from './type'

const execFileAsync = promisify(execFile)
const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SPOTLIGHT_HOTKEY_ID = 64
const SYMBOLIC_HOTKEYS_DOMAIN = 'com.apple.symbolichotkeys'
const PLIST_PATH = path.join(
	os.homedir(),
	'Library/Preferences/com.apple.symbolichotkeys.plist',
)

type TNativeShortcutModule = {
	isSpotlightShortcutEnabled: () => boolean
	setSpotlightShortcutEnabled: (enabled: boolean) => boolean
}

let initialized = false
let nativeModule: TNativeShortcutModule | null | undefined

function getNativeModule() {
	if (nativeModule !== undefined) return nativeModule

	if (process.platform !== 'darwin') {
		nativeModule = null
		return nativeModule
	}

	try {
		const modulePath = app.isPackaged
			? path.join(
					process.resourcesPath,
					'electron/modules/nsevent-listener/build/Release/nsevent_listener.node',
				)
			: path.join(
					__dirname,
					'../electron/modules/nsevent-listener/build/Release/nsevent_listener.node',
				)
		nativeModule = require(modulePath) as TNativeShortcutModule
	} catch (error) {
		console.error('加载原生快捷键模块失败:', error)
		nativeModule = null
	}

	return nativeModule
}

async function readPersistedEnabled() {
	try {
		const { stdout } = await execFileAsync('/usr/libexec/PlistBuddy', [
			'-c',
			`Print :AppleSymbolicHotKeys:${SPOTLIGHT_HOTKEY_ID}:enabled`,
			PLIST_PATH,
		])
		return stdout.trim().toLowerCase() === 'true'
	} catch {
		return null
	}
}

async function writePersistedEnabled(enabled: boolean) {
	let xml: string
	try {
		const result = await execFileAsync('/usr/bin/plutil', [
			'-extract',
			`AppleSymbolicHotKeys.${SPOTLIGHT_HOTKEY_ID}`,
			'xml1',
			'-o',
			'-',
			PLIST_PATH,
		])
		xml = result.stdout
	} catch {
		throw new Error('找不到系统聚焦搜索快捷键配置')
	}

	const pattern = /(<key>enabled<\/key>\s*)<(?:true|false)\s*\/>/
	if (!pattern.test(xml)) {
		throw new Error('系统聚焦搜索快捷键配置格式异常')
	}

	const updated = xml.replace(
		pattern,
		`$1<${enabled ? 'true' : 'false'}/>`,
	)
	await execFileAsync('/usr/bin/defaults', [
		'write',
		SYMBOLIC_HOTKEYS_DOMAIN,
		'AppleSymbolicHotKeys',
		'-dict-add',
		String(SPOTLIGHT_HOTKEY_ID),
		updated,
	])

	for (let attempt = 0; attempt < 3; attempt++) {
		if ((await readPersistedEnabled()) === enabled) return
		await new Promise(resolve => setTimeout(resolve, 60))
	}
	throw new Error('写入系统快捷键配置失败')
}

export async function getSpotlightShortcutState(): Promise<TSpotlightShortcutState> {
	if (process.platform !== 'darwin') {
		return { supported: false, available: false, disabled: false }
	}

	const native = getNativeModule()
	if (!native?.isSpotlightShortcutEnabled) {
		return {
			supported: true,
			available: false,
			disabled: false,
			message: '原生快捷键模块不可用，请重新构建应用',
		}
	}

	try {
		return {
			supported: true,
			available: true,
			disabled: !native.isSpotlightShortcutEnabled(),
		}
	} catch (error) {
		return {
			supported: true,
			available: false,
			disabled: false,
			message:
				error instanceof Error
					? error.message
					: '读取聚焦搜索快捷键状态失败',
		}
	}
}

export async function setSpotlightShortcutDisabled(
	disabled: boolean,
): Promise<TSpotlightShortcutResult> {
	if (process.platform !== 'darwin') {
		return { ok: false, message: '仅支持 macOS' }
	}

	const native = getNativeModule()
	if (
		!native?.setSpotlightShortcutEnabled ||
		!native?.isSpotlightShortcutEnabled
	) {
		return { ok: false, message: '原生快捷键模块不可用，请重新构建应用' }
	}

	const previous = await readPersistedEnabled()
	try {
		await writePersistedEnabled(!disabled)
		const runtimeEnabled = native.setSpotlightShortcutEnabled(!disabled)
		if (runtimeEnabled !== !disabled) {
			throw new Error('系统没有接受快捷键修改，请注销后重试')
		}
		return { ok: true, disabled: !runtimeEnabled }
	} catch (error) {
		if (previous !== null) {
			try {
				await writePersistedEnabled(previous)
			} catch {
				/** 回滚失败时保留原错误，下次打开设置会显示系统真实状态 */
			}
		}
		return {
			ok: false,
			message:
				error instanceof Error
					? error.message
					: '修改聚焦搜索快捷键失败',
		}
	}
}

export function initSpotlight() {
	if (initialized) return
	initialized = true

	ipcMain.handle('SPOTLIGHT_GET_STATE', () => getSpotlightShortcutState())
	ipcMain.handle('SPOTLIGHT_SET_DISABLED', (_, disabled: unknown) => {
		if (typeof disabled !== 'boolean') {
			return { ok: false, message: '参数不正确' }
		}
		return setSpotlightShortcutDisabled(disabled)
	})
}
