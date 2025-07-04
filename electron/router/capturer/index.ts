import { BrowserWindow, desktopCapturer, screen, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { VITE_DEV_SERVER_URL, RENDERER_DIST } from '../../main'
import { navigate } from '../core'
import { TCaptureSaveParams } from './type'
import { hoverWindows } from './hover'
import { copyImageToClipboard } from '../../utils/storage'
import { getCurrentDisplay } from '../../utils/display'
import { NORMAL_SCREEN_SIZE, T_SCREEN_SIZE_TYPE } from '../../ipc/screen'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class CaptureWindow implements TWindows {
	public instance: BrowserWindow | null = null

	routerName: T_SCREEN_SIZE_TYPE = 'TRANSLATE'

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

		ipcMain.on('COMMAND_TRIGGER_CAPTURER', () => {
			navigate.routerMap?.base.close()
			this.shortcutCallback()
		})

		ipcMain.on('CAPTURE_LOG', (_, log) => {
			console.log('log', log)
		})
	}

	create(onLoad?: () => void) {
		this.instance = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC || '', 'logo.png'),
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
			onLoad?.()
		})

		if (VITE_DEV_SERVER_URL) {
			this.instance.loadURL(VITE_DEV_SERVER_URL)
		} else {
			this.instance.loadFile(path.join(RENDERER_DIST, 'index.html'))
		}

		if (import.meta.env.VITE_APP_OPEN_DEV_TOOLS === 'true') {
			this.instance?.webContents.openDevTools()
		}

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
		this.destroy()
	}

	shortcutCallback = async () => {
		try {
			const todoFn = async () => {
				if (this.instance?.isVisible() || this.isEditingHotKey) {
					/**已展示不可重复开启 */
					this.instance?.focus()
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

				/**
				 * 这是一个bugfix 在mac 端 初次截屏 会导致 base 的窗口高度触发变化
				 */
				navigate.routerMap?.base.instance?.setBounds({
					height: NORMAL_SCREEN_SIZE.height,
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
				console.log('SEND_CAPTURE')
				this.instance?.webContents?.send('CAPTURE_TRIGGER', capturerMessage)
			}
			if (!this.instance) {
				/**
				 * 需要在 create 加载成功之后的回调中 处理
				 */
				console.log('createNew instance')
				this.create(todoFn)
			} else {
				todoFn()
			}
		} catch (error) {
			console.error('Error in captureFn:', error)
			// Handle the error appropriately, maybe show a message to the user
		}
	}
}

export const capturerWindow = new CaptureWindow()
