import { BrowserWindow, screen } from 'electron'
import { WindowSettingConfig } from '../const'
import path from 'node:path'
import { RENDERER_DIST, VITE_DEV_SERVER_URL } from '../main'
import { fileURLToPath } from 'node:url'
import { currentScreen } from './screen'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function getOpenWindowBound() {
	const { width } = currentScreen.value
	const currentDisplay = screen.getCursorScreenPoint()
	const displays = screen.getAllDisplays()

	const display = displays.find(display => {
		return (
			currentDisplay.x >= display.bounds.x &&
			currentDisplay.x <= display.bounds.x + display.bounds.width &&
			currentDisplay.y >= display.bounds.y &&
			currentDisplay.y <= display.bounds.y + display.bounds.height
		)
	})

	return {
		x: display!.bounds.x + display!.bounds.width / 2 - width / 2, // 窗口居中
		y: display!.bounds.y + display!.bounds.height / 4.5,
	}
}

export function createSettingWindow() {
	const settingWindow = new BrowserWindow({
		icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
		webPreferences: {
			preload: path.join(__dirname, 'preload.mjs'),
		},
		resizable: false,
		frame: false,
		alwaysOnTop: true,
		// width: WindowBaseConfig.width,
		// height: WindowBaseConfig.height,
		width: WindowSettingConfig.width,
		height: WindowSettingConfig.height,
		show: false,
	})

	settingWindow.webContents.on('did-finish-load', () => {
		settingWindow.webContents.executeJavaScript(
			`window.location.hash = '#/setting';`
		)
		const { x, y } = getOpenWindowBound()
		settingWindow!.setBounds({ x, y })
	})

	if (VITE_DEV_SERVER_URL) {
		settingWindow.loadURL(VITE_DEV_SERVER_URL)
	} else {
		// win.loadFile('dist/index.html')
		settingWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
	}

	return settingWindow
}
