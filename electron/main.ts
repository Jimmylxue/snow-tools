import { app, BrowserWindow, systemPreferences } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initRouter } from './router'
import { appTray } from './config/tray'
import { navigate } from './router/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
	? path.join(process.env.APP_ROOT, 'public')
	: RENDERER_DIST

export const is_mac = process.platform === 'darwin'
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
	// 如果已经有实例运行，直接退出
	app.quit()
	process.exit(0)
}

// 处理第二个实例启动
app.on('second-instance', () => {
	if (navigate.routerMap?.base) {
		navigate.routerMap?.base.show()
	}
})

if (is_mac) {
	app.dock.hide() // - 1 -
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()

		// mainWindow = null
	}
	appTray.destroy()
})

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		// createWindow()
	}
})

app.on('will-quit', () => {
	appTray.destroy()
})

app.whenReady().then(async () => {
	initRouter()
	if (is_mac) {
		console.log(
			'辅助功能权限:',
			await systemPreferences.isTrustedAccessibilityClient(false)
		)
	}
})
