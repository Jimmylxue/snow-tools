import { app, ipcMain, shell } from 'electron'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { TAutoLaunchSetResult, TAutoLaunchState } from './type'

const HIDDEN_ARG = '--hidden'
const LINUX_AUTOSTART_FILE = path.join(
	os.homedir(),
	'.config',
	'autostart',
	'snow-tools.desktop',
)

let initialized = false

function windowsLoginOptions() {
	return { path: process.execPath, args: [HIDDEN_ARG] }
}

async function isLinuxAutostartEnabled() {
	try {
		await fs.access(LINUX_AUTOSTART_FILE)
		return true
	} catch {
		return false
	}
}

async function getState(): Promise<TAutoLaunchState> {
	if (process.platform === 'linux') {
		return {
			available: true,
			enabled: await isLinuxAutostartEnabled(),
			isPackaged: app.isPackaged,
			status: null,
		}
	}

	if (!app.isPackaged) {
		return {
			available: false,
			enabled: false,
			isPackaged: false,
			status: null,
			reason: '开发环境下注册的是 Electron 本身，安装打包版本后才能设置开机自启',
		}
	}

	try {
		const settings =
			process.platform === 'darwin'
				? app.getLoginItemSettings()
				: app.getLoginItemSettings(windowsLoginOptions())

		return {
			available: true,
			enabled: settings.openAtLogin,
			isPackaged: true,
			status: settings.status ?? null,
		}
	} catch (error) {
		return {
			available: false,
			enabled: false,
			isPackaged: true,
			status: null,
			reason:
				error instanceof Error ? error.message : '读取开机自启状态失败',
		}
	}
}

async function setLinuxAutostart(enabled: boolean) {
	if (!enabled) {
		await fs.rm(LINUX_AUTOSTART_FILE, { force: true })
		return
	}

	await fs.mkdir(path.dirname(LINUX_AUTOSTART_FILE), { recursive: true })

	/** AppImage 的 process.execPath 在临时挂载目录里，重启后会失效 */
	const execPath = process.env.APPIMAGE || process.execPath
	const exec = app.isPackaged
		? `"${execPath}" ${HIDDEN_ARG}`
		: `"${execPath}" "${app.getAppPath()}" ${HIDDEN_ARG}`

	const desktopEntry = [
		'[Desktop Entry]',
		'Type=Application',
		'Name=SnowTools',
		`Exec=${exec}`,
		'Terminal=false',
		'X-GNOME-Autostart-enabled=true',
		'',
	].join('\n')

	await fs.writeFile(LINUX_AUTOSTART_FILE, desktopEntry, 'utf8')
}

async function setEnabled(enabled: boolean): Promise<TAutoLaunchSetResult> {
	const current = await getState()
	if (!current.available) {
		return {
			ok: false,
			message: current.reason ?? '当前环境不支持设置开机自启',
		}
	}

	try {
		if (process.platform === 'linux') {
			await setLinuxAutostart(enabled)
		} else if (process.platform === 'darwin') {
			app.setLoginItemSettings({ openAtLogin: enabled })
		} else {
			app.setLoginItemSettings({
				openAtLogin: enabled,
				...windowsLoginOptions(),
			})
		}
	} catch (error) {
		return {
			ok: false,
			message: error instanceof Error ? error.message : '设置开机自启失败',
		}
	}

	return { ok: true, state: await getState() }
}

function openLoginItemsSettings() {
	if (process.platform === 'darwin') {
		return shell.openExternal(
			'x-apple.systempreferences:com.apple.LoginItems-Settings.extension',
		)
	}

	if (process.platform === 'win32') {
		return shell.openExternal('ms-settings:startupapps')
	}

	return Promise.resolve()
}

export function initAutoLaunch() {
	if (initialized) return
	initialized = true

	ipcMain.handle('AUTO_LAUNCH_GET', () => getState())
	ipcMain.handle('AUTO_LAUNCH_SET', (_, enabled: unknown) =>
		setEnabled(enabled === true),
	)
	ipcMain.handle('AUTO_LAUNCH_OPEN_SETTINGS', () => {
		void openLoginItemsSettings()
	})
}

/**
 * 登录时自动启动的场景不应该把启动器弹出来，只保留托盘和全局快捷键
 */
export function shouldStartHidden() {
	if (process.argv.includes(HIDDEN_ARG)) return true
	if (process.platform !== 'darwin' || !app.isPackaged) return false

	try {
		return app.getLoginItemSettings().wasOpenedAtLogin
	} catch {
		return false
	}
}
