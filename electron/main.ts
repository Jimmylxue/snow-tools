import { app, BrowserWindow, screen } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { screenEvent } from './ipc/window'
import { registerHotKey } from './ipc/hotkey'
import { init } from './ipc/apps'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
	? path.join(process.env.APP_ROOT, 'public')
	: RENDERER_DIST

let mainWindow: BrowserWindow | null

function createWindow() {
	const { width, height } = screen.getPrimaryDisplay().workAreaSize // 获取屏幕宽度
	const x = Math.round((width - 600) / 2) // 计算水平居中位置
	const y = Math.round(height / 3) // 设置垂直位置为 300px

	mainWindow = new BrowserWindow({
		icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
		webPreferences: {
			preload: path.join(__dirname, 'preload.mjs'),
		},
		resizable: false,
		frame: false,
		width: 600,
		height: 62,
		x,
		y,
	})

	// Test active push message to Renderer-process.
	mainWindow.webContents.on('did-finish-load', () => {
		mainWindow?.webContents.send(
			'main-process-message',
			new Date().toLocaleString()
		)
		screenEvent(mainWindow!)
		registerHotKey(mainWindow!)
		init()
	})

	if (VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(VITE_DEV_SERVER_URL)
	} else {
		// win.loadFile('dist/index.html')
		mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
	}
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

app.whenReady().then(createWindow)
