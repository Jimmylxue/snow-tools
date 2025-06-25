import { BrowserWindow, globalShortcut, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { showWindow } from '../../ipc/window'
import { initClipboard } from '../../biz/clipboard'
import { currentScreen, screenEvent } from '../../ipc/screen'
import { VITE_DEV_SERVER_URL, RENDERER_DIST } from '../../main'
import { getLocalStorageHotKey } from './hotkey'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class MainWindow implements TWindows {
	public instance: BrowserWindow | null = null

	public currentHotKey: string = ''

	isEditingHotKey: boolean = false

	constructor() {}

	create() {
		const { width, height } = currentScreen.value
		this.instance = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
			webPreferences: {
				preload: path.join(__dirname, 'preload.mjs'),
			},
			resizable: false,
			frame: false,
			alwaysOnTop: true,
			show: false,
			width,
			height,
			fullscreenable: false,
		})

		// Test active push message to Renderer-process.
		this.instance.webContents.on('did-finish-load', () => {
			this.instance?.webContents.executeJavaScript(
				`window.location.hash = '#/base';`
			)
			this.instance?.webContents.send(
				'main-process-message',
				new Date().toLocaleString()
			)
			if (import.meta.env.VITE_APP_OPEN_DEV_TOOLS === 'true') {
				this.instance?.webContents.openDevTools()
			}
			showWindow(this.instance!)
			screenEvent(this.instance!)
			// registerHotKey(this.instance!)
			initClipboard(this.instance!)

			this.instance?.on('blur', () => {
				this.instance?.setOpacity(0)
				this.instance?.hide()
			})

			this.instance?.on('focus', () => {
				this.instance?.setOpacity(1)
				this.instance?.show()
			})
		})

		if (VITE_DEV_SERVER_URL) {
			this.instance.loadURL(VITE_DEV_SERVER_URL)
		} else {
			// win.loadFile('dist/index.html')
			this.instance.loadFile(path.join(RENDERER_DIST, 'index.html'))
		}

		this.updateHotKey()

		ipcMain.on('EDITING_OPEN_HOT_KEY_COMPLETE', () => {
			this.isEditingHotKey = false
			this.updateHotKey()
		})

		ipcMain.on('EDITING_OPEN_HOT_KEY', () => {
			this.isEditingHotKey = true
			console.log('this.currentKey', this.currentHotKey)
			this.currentHotKey && globalShortcut.unregister(this.currentHotKey)
			this.currentHotKey = ''
		})

		return this.instance
	}

	destroy() {
		if (this.instance && !this.instance.isDestroyed()) {
			this.instance.destroy()
			this.instance = null
		}
	}

	show() {
		this.instance?.setOpacity(1)
		this.instance?.focus()
		showWindow(this.instance!)
		this.instance?.webContents.send('window-shown')
	}

	close() {
		this.instance?.setOpacity(0)
		this.instance?.hide()
	}

	async updateHotKey() {
		const hotkey = await getLocalStorageHotKey(this.instance!)
		if (hotkey === this.currentHotKey) return

		if (this.currentHotKey) {
			globalShortcut.unregister(this.currentHotKey)
		}

		try {
			// 注册新的热键
			globalShortcut.register(hotkey, () => {
				if (this.instance?.isVisible()) {
					if (this.isEditingHotKey) return
					this.instance?.setOpacity(0)
					this.instance?.hide()
				} else {
					this.show()
				}
			})

			this.currentHotKey = hotkey
			console.log(`Hotkey updated to: ${hotkey}`)
		} catch (error) {
			console.error('Failed to register hotkey:', error)
			// 可以在这里通知渲染进程注册失败
			this.instance?.webContents.send('hotkey-register-failed', hotkey)
		}
	}
}

export const mainWindow = new MainWindow()
