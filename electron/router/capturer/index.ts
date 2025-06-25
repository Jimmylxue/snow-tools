import {
	BrowserWindow,
	globalShortcut,
	desktopCapturer,
	screen,
	ipcMain,
} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { VITE_DEV_SERVER_URL, RENDERER_DIST } from '../../main'
import { getLocalStorageHotKey } from './hotkey'
import { navigate } from '../core'
import { TCaptureSaveParams } from './type'
import { hoverWindows } from './hover'
import { copyImageToClipboard } from '../../utils/storage'
import { getCurrentDisplay } from '../../utils/display'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class CaptureWindow implements TWindows {
	public instance: BrowserWindow | null = null

	public currentHotKey: string = ''

	isEditingHotKey: boolean = false

	constructor() {
		ipcMain.on('CAPTURER_SAVE', (_, source: TCaptureSaveParams) => {
			copyImageToClipboard(source.source)
		})

		/**
		 * 展示 屏幕  防止白屏 等待 canvas 渲染好之后再进行展示
		 */
		ipcMain.on('SHOW_CAPTURER_SCREEN', () => {
			this.show()
		})

		ipcMain.on('CAPTURER_HOVER', (_, source: TCaptureSaveParams) => {
			hoverWindows.generate(source)
		})

		ipcMain.on('EDITING_CAPTURER_HOT_KET_COMPLETE', () => {
			this.isEditingHotKey = false
			this.updateHotKey()
		})

		ipcMain.on('EDITING_CAPTURER_HOT_KEY', () => {
			this.isEditingHotKey = true
			globalShortcut.unregister(this.currentHotKey)
			this.currentHotKey = ''
		})

		ipcMain.on('COMMAND_TRIGGER_CAPTURER', () => {
			navigate.routerMap?.base.close()
			this.captureFn()
		})
	}

	create() {
		this.instance = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
			webPreferences: {
				preload: path.join(__dirname, 'preload.mjs'),
			},
			resizable: false,
			frame: false,
			alwaysOnTop: true,
			show: false,
			fullscreenable: true,
			roundedCorners: false,
		})

		// Test active push message to Renderer-process.
		this.instance.webContents.on('did-finish-load', () => {
			this.instance?.webContents.executeJavaScript(
				`window.location.hash = '#/capturer';`
			)
			this.instance!.setBounds({ x: 0, y: 0 })
		})

		if (VITE_DEV_SERVER_URL) {
			this.instance.loadURL(VITE_DEV_SERVER_URL)
		} else {
			this.instance.loadFile(path.join(RENDERER_DIST, 'index.html'))
		}

		if (import.meta.env.VITE_APP_OPEN_DEV_TOOLS === 'true') {
			this.instance?.webContents.openDevTools()
		}

		this.updateHotKey()

		return this.instance
	}

	destroy() {
		if (this.instance && !this.instance.isDestroyed()) {
			this.instance.setOpacity(0)
			this.instance.removeAllListeners()
			this.instance.minimize()
			this.instance!.destroy()
			this.instance = null
		}
	}

	show() {
		const currentDisplay = getCurrentDisplay()
		currentDisplay
		this.instance?.setBounds({
			x: currentDisplay?.bounds.x,
			y: currentDisplay?.bounds.y,
		})
		this.instance?.setVisibleOnAllWorkspaces(true, {
			visibleOnFullScreen: true,
			skipTransformProcessType: true,
		})
		this.instance?.show()
		this.instance?.focus()
	}

	close() {
		// this.instance?.close()
		this.destroy()

		// this.instance = null
		// this.instance?.webContents.send('CAPTURE_CLOSE')
	}

	captureFn = async () => {
		try {
			if (!this.instance) {
				this.create()
			}
			if (this.instance?.isVisible() || this.isEditingHotKey) {
				/**已展示不可重复开启 */
				return
			}
			const scaleFactor = screen.getPrimaryDisplay().scaleFactor
			const mousePoint = screen.getCursorScreenPoint()
			const currentDisplay = screen.getDisplayNearestPoint(mousePoint)

			if (!currentDisplay) {
				throw new Error('No display found')
			}

			const { width, height, x, y } = currentDisplay.bounds

			// Make sure width and height are integers
			const displayBounds = {
				x: Math.floor(x),
				y: Math.floor(y),
				width: Math.floor(width),
				height: Math.floor(height),
			}

			this.instance?.setBounds(displayBounds)

			const sources = await desktopCapturer.getSources({
				types: ['screen'],
				thumbnailSize: {
					width: Math.floor(width * scaleFactor),
					height: Math.floor(height * scaleFactor),
				},
			})

			const primarySource = sources.find(
				source => source.display_id === currentDisplay.id.toString()
			)

			if (!primarySource || !primarySource.thumbnail) {
				throw new Error(
					'Screen capture failed - no source or thumbnail available'
				)
			}

			const capturerMessage = {
				source: primarySource.thumbnail.toDataURL(),
				scaleFactor,
				type: 'region',
			}

			setTimeout(() => {
				this.instance?.webContents?.send('CAPTURE_TRIGGER', capturerMessage)
			}, 50)
		} catch (error) {
			console.error('Error in captureFn:', error)
			// Handle the error appropriately, maybe show a message to the user
		}
	}

	async updateHotKey() {
		const hotkey = await getLocalStorageHotKey(this.instance!)
		if (hotkey === this.currentHotKey) return

		if (this.currentHotKey) {
			globalShortcut.unregister(this.currentHotKey)
		}

		try {
			globalShortcut.register(hotkey, this.captureFn)
			this.currentHotKey = hotkey
			console.log(`Capturer Hotkey updated to: ${hotkey}`)
		} catch (error) {
			console.error('Failed to register hotkey:', error)
			// 可以在这里通知渲染进程注册失败
			this.instance?.webContents.send('hotkey-register-capturer_failed', hotkey)
		}
	}
}

export const capturerWindow = new CaptureWindow()
