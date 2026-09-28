import {
	BrowserWindow,
	desktopCapturer,
	screen,
	ipcMain,
	NativeImage,
	Display,
	dialog,
	shell,
} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { VITE_DEV_SERVER_URL, RENDERER_DIST, is_mac } from '../../main'
import { navigate } from '../core'
import { TCaptureSaveParams } from './type'
import { hoverWindows } from './hover'
import { copyImageToClipboard } from '../../utils/storage'
import { getCurrentDisplay } from '../../utils/display'
import { tagPngDisplayP3 } from '../../utils/pngColorProfile'
import { NORMAL_SCREEN_SIZE, T_SCREEN_SIZE_TYPE } from '../../ipc/screen'
import {
	captureMacDisplay,
	getScreenCaptureDeniedMessage,
	ScreenCaptureDeniedError,
} from '../../utils/macosCapture'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class CaptureWindow implements TWindows {
	public instance: BrowserWindow | null = null

	private isReady = false

	private pendingCapture: (() => void) | null = null

	private latestCaptureSource: Uint8Array | null = null

	private screenCaptureDialogOpen = false

	routerName: T_SCREEN_SIZE_TYPE = 'TRANSLATE'

	public currentHotKey: string = ''

	isEditingHotKey: boolean = false

	constructor() {
		ipcMain.on('CAPTURER_SAVE', (_, source: TCaptureSaveParams) => {
			const capture = this.getFinalCapture(source)
			if (!capture) {
				return
			}
			copyImageToClipboard(capture)
		})

		/**
		 * 展示 屏幕  防止白屏 等待 canvas 渲染好之后再进行展示
		 */
		ipcMain.on('SHOW_CAPTURER_SCREEN', () => {
			this.show()
		})

		ipcMain.on('CAPTURER_HOVER', (_, source: TCaptureSaveParams) => {
			const capture = this.getFinalCapture(source)
			if (!capture) {
				return
			}
			hoverWindows.generate({ ...source, source: capture })
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
		if (this.instance && !this.instance.isDestroyed()) {
			onLoad?.()
			return this.instance
		}

		this.isReady = false
		this.instance = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC || '', 'logo.png'),
			webPreferences: {
				preload: path.join(__dirname, 'preload.mjs'),
				backgroundThrottling: false,
				contextIsolation: true,
				nodeIntegration: false,
			},
			resizable: false,
			frame: false,
			alwaysOnTop: true,
			show: false,
			fullscreenable: true,
			roundedCorners: false,
			backgroundColor: '#000000',
		})

		// Test active push message to Renderer-process.
		this.instance.webContents.on('did-finish-load', () => {
			this.instance?.webContents.executeJavaScript(
				`window.location.hash = '#/capturer';`,
			)
			this.instance!.setBounds({ x: 0, y: 0 })
			this.isReady = true
			const callback = onLoad ?? this.pendingCapture
			this.pendingCapture = null
			callback?.()
		})

		this.instance.on('closed', () => {
			this.instance = null
			this.isReady = false
			this.pendingCapture = null
			this.latestCaptureSource = null
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
			this.instance.hide()
			this.instance.destroy()
			this.instance = null
			this.isReady = false
			this.pendingCapture = null
			this.latestCaptureSource = null
		}
	}

	/**
	 * 带标注的合成图由渲染层产出，主进程只负责补上 Display P3 标记
	 */
	private getFinalCapture(params: TCaptureSaveParams) {
		if (!params.source?.byteLength) {
			console.warn('Capturer request without composited image')
			return null
		}

		return is_mac ? tagPngDisplayP3(params.source) : params.source
	}

	private toPngBytes(image: NativeImage) {
		const png = image.toPNG()

		return is_mac ? tagPngDisplayP3(new Uint8Array(png)) : new Uint8Array(png)
	}

	/**
	 * 进程内取图，鉴权对象是应用自身，用于 screencapture 被拒时兜底
	 */
	private async captureDisplayImage(targetDisplay: Display) {
		const { width, height } = targetDisplay.bounds
		const sources = await desktopCapturer.getSources({
			types: ['screen'],
			thumbnailSize: {
				width: Math.floor(width * targetDisplay.scaleFactor),
				height: Math.floor(height * targetDisplay.scaleFactor),
			},
		})

		const targetSource = sources.find(
			source => source.display_id === targetDisplay.id.toString(),
		)

		if (
			!targetSource ||
			targetSource.thumbnail.isEmpty() ||
			!targetSource.thumbnail.getSize().width
		) {
			throw new Error(
				'Screen capture failed - no source or thumbnail available',
			)
		}

		return targetSource.thumbnail
	}

	private reportCaptureError(error: unknown) {
		console.error('Error in captureFn:', error)

		if (error instanceof ScreenCaptureDeniedError) {
			this.showScreenCapturePermissionDialog()
		}
	}

	private showScreenCapturePermissionDialog() {
		if (this.screenCaptureDialogOpen) {
			return
		}

		this.screenCaptureDialogOpen = true

		dialog
			.showMessageBox({
				type: 'warning',
				title: '需要屏幕录制权限',
				message: 'snow-tools 无法截取屏幕',
				detail: getScreenCaptureDeniedMessage(),
				buttons: ['稍后', '立即前往'],
				defaultId: 1,
				cancelId: 0,
			})
			.then(({ response }) => {
				if (response === 1) {
					shell.openExternal(
						'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
					)
				}
			})
			.finally(() => {
				this.screenCaptureDialogOpen = false
			})
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
		this.instance?.setOpacity(1)
		this.instance?.show()
		this.instance?.focus()
	}

	close() {
		this.instance?.webContents.send('CAPTURE_CLOSE')
		this.instance?.setOpacity(0)
		this.instance?.hide()
	}

	shortcutCallback = async () => {
		/**
		 * 全局快捷键路径也要先收起启动器，否则它浮在遮罩上挡住点击
		 */
		navigate.routerMap?.base.close()

		try {
			const todoFn = async () => {
				if (this.instance?.isVisible() || this.isEditingHotKey) {
					/**已展示不可重复开启 */
					this.instance?.focus()
					return
				}
				const mousePoint = screen.getCursorScreenPoint()
				const currentDisplay = screen.getDisplayNearestPoint(mousePoint)

				if (!currentDisplay) {
					throw new Error('No display found')
				}

				const scaleFactor = currentDisplay.scaleFactor
				const { width, height, x, y } = currentDisplay.bounds

				// Make sure width and height are integers
				const displayBounds = {
					x: Math.floor(x),
					y: Math.floor(y),
					width: Math.floor(width),
					height: Math.floor(height),
				}

				this.instance?.setBounds(displayBounds)

				if (is_mac) {
					/**
					 * 优先 screencapture：异步执行不卡主进程，且 PNG 自带 Display P3 描述文件。
					 * 它鉴权的是启动 dev 的终端，拿不到权限时再退回进程内取图。
					 */
					try {
						this.latestCaptureSource =
							await captureMacDisplay(currentDisplay)
					} catch (error) {
						if (!(error instanceof ScreenCaptureDeniedError)) {
							throw error
						}

						console.warn(
							'screencapture denied, falling back to desktopCapturer:',
							error,
						)
						this.latestCaptureSource = this.toPngBytes(
							await this.captureDisplayImage(currentDisplay),
						)
					}
				} else {
					this.latestCaptureSource = this.toPngBytes(
						await this.captureDisplayImage(currentDisplay),
					)
				}

				/**
				 * 这是一个bugfix 在mac 端 初次截屏 会导致 base 的窗口高度触发变化
				 */
				navigate.routerMap?.base.instance?.setBounds({
					height: NORMAL_SCREEN_SIZE.height,
				})

				if (
					!this.latestCaptureSource ||
					this.latestCaptureSource.byteLength === 0
				) {
					throw new Error('Screen capture failed - empty image buffer')
				}

				const capturerMessage = {
					source: this.latestCaptureSource,
					scaleFactor,
					type: 'region',
				}
				console.log('SEND_CAPTURE')
				this.instance?.webContents?.send('CAPTURE_TRIGGER', capturerMessage)
			}

			if (!this.instance || this.instance.isDestroyed()) {
				/**
				 * 需要在 create 加载成功之后的回调中 处理
				 */
				console.log('createNew instance')
				this.create(() => {
					void todoFn()
				})
				return
			}

			if (!this.isReady) {
				this.pendingCapture = () => {
					void todoFn()
				}
				return
			}

			await todoFn()
		} catch (error) {
			this.reportCaptureError(error)
		}
	}
}

export const capturerWindow = new CaptureWindow()
