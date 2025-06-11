import { app, BrowserWindow, systemPreferences, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
	createSettingWindow,
	getOpenWindowBound,
	showWindow,
} from './ipc/window'
import { init } from './ipc/apps'
import { WindowBaseConfig } from './const'
import { routerEvent } from './ipc/router'
import { screenEvent } from './ipc/screen'
import { registerHotKey } from './ipc/hotkey'
import { initClipboard } from './biz/clipboard'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
	? path.join(process.env.APP_ROOT, 'public')
	: RENDERER_DIST

let mainWindow: BrowserWindow | null

let settingWindow: BrowserWindow

function createWindow() {
	const { x, y } = getOpenWindowBound()

	mainWindow = new BrowserWindow({
		// icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
		webPreferences: {
			preload: path.join(__dirname, 'preload.mjs'),
		},
		resizable: false,
		frame: false,
		alwaysOnTop: true,
		width: WindowBaseConfig.width,
		height: WindowBaseConfig.height,
		x,
		y,
		show: false,
		fullscreenable: true,
	})

	// Test active push message to Renderer-process.
	mainWindow.webContents.on('did-finish-load', () => {
		mainWindow?.webContents.send(
			'main-process-message',
			new Date().toLocaleString()
		)
		// mainWindow?.webContents.openDevTools() 开启F12
		mainWindow?.webContents.openDevTools()
		showWindow(mainWindow!)
		screenEvent(mainWindow!)
		registerHotKey(mainWindow!)
		initClipboard(mainWindow!)
		init()

		mainWindow?.on('blur', () => {
			mainWindow?.setOpacity(0)
			mainWindow?.hide()
		})

		mainWindow?.on('focus', () => {
			mainWindow?.setOpacity(1)
			mainWindow?.show()
		})
	})

	if (VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(VITE_DEV_SERVER_URL)
	} else {
		// win.loadFile('dist/index.html')
		mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
	}

	async function checkAccessibilityPermissions() {
		if (process.platform !== 'darwin') return true

		const hasAccess = await systemPreferences.isTrustedAccessibilityClient(
			false
		)
		if (hasAccess) return true

		const { response } = await dialog.showMessageBox({
			type: 'question',
			buttons: ['打开设置', '取消'],
			title: '需要辅助功能权限',
			message: '此功能需要访问辅助功能权限以监听系统快捷键',
			detail: '请前往系统设置授予权限，然后重新启动应用',
		})

		if (response === 0) {
			// 使用动态导入 child_process
			const { exec } = await import('child_process')
			exec(
				'open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"'
			)
		}

		return false
	}

	setTimeout(() => {
		checkAccessibilityPermissions()
	}, 3000)
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
		mainWindow = null
	}
})

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow()
	}
})

app.whenReady().then(async () => {
	createWindow()

	settingWindow = createSettingWindow()
	routerEvent({
		base: mainWindow!,
		setting: settingWindow,
	})
	console.log(
		'辅助功能权限:',
		await systemPreferences.isTrustedAccessibilityClient(false)
	)
})
