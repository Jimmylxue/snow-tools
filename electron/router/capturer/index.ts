import {
	BrowserWindow,
	globalShortcut,
	desktopCapturer,
	screen,
	ipcMain,
	nativeImage,
	clipboard,
} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { VITE_DEV_SERVER_URL, RENDERER_DIST } from '../../main'
import { getLocalStorageHotKey } from './hotkey'
import { navigate } from '../core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class CaptureWindow implements TWindows {
	public instance: BrowserWindow | null = null

	public currentHotKey: string = ''

	isEditingHotKey: boolean = false

	constructor() {}

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

		ipcMain.on('CAPTURER_SAVE', (_, base64Data: string) => {
			try {
				// 移除 Base64 前缀（如果有）
				const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')

				// 创建 NativeImage 实例
				const image = nativeImage.createFromBuffer(
					Buffer.from(base64, 'base64')
				)

				// 复制图片到剪贴板
				clipboard.writeImage(image)

				console.log('图片已复制到剪贴板')
			} catch (error) {
				console.error('复制图片失败:', error)
			}
		})

		ipcMain.on('EDITING_CAPTURER_HOT_KET_COMPLETE', () => {
			this.isEditingHotKey = false
			this.updateHotKey()
		})

		ipcMain.on('EDITING_CAPTURER_HOT_KEY', () => {
			this.isEditingHotKey = true
			// this.updateHotKey()
			globalShortcut.unregister(this.currentHotKey)
			this.currentHotKey = ''
		})

		ipcMain.on('COMMAND_TRIGGER_CAPTURER', () => {
			navigate.routerMap?.base.close()
			this.captureFn()
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
		this.instance?.setVisibleOnAllWorkspaces(true, {
			visibleOnFullScreen: true,
			skipTransformProcessType: true,
		})
		this.instance?.hide()
		setTimeout(() => {
			this.instance?.show()
			this.instance?.focus()
		}, 100)
	}

	close() {
		// this.instance?.setOpacity(0)
		this.instance?.hide()
	}

	captureFn = async () => {
		if (this.instance?.isVisible() || this.isEditingHotKey) {
			/**已展示不可重复开启 */
			return
		}
		const scaleFactor = screen.getPrimaryDisplay().scaleFactor
		const mousePoint = screen.getCursorScreenPoint()
		const currentDisplay = screen.getDisplayNearestPoint(mousePoint)
		const { width, height, x, y } = currentDisplay!.bounds
		this.instance?.setBounds({ x, y, width, height })
		// navigate.routerMap?.base.instance?.setBounds({ height: 60 })
		const sources = await desktopCapturer.getSources({
			types: ['screen'],
			thumbnailSize: {
				width: width * scaleFactor,
				height: height * scaleFactor,
			},
		})

		const primarySource = sources.find(
			source => source.display_id === currentDisplay.id.toString()
		)

		if (primarySource) {
			const capturerMessage = {
				source: primarySource.thumbnail.toDataURL(),
				// type: 'fullscreen',
				type: 'region',
			}
			this.instance?.webContents.send('CAPTURE_TRIGGER', capturerMessage)
			this.instance?.show()
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
