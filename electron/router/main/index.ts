import { BrowserWindow, systemPreferences } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { initClipboard } from '../../biz/clipboard'
import { NORMAL_SCREEN_SIZE, T_SCREEN_SIZE_TYPE } from '../../ipc/screen'
import { VITE_DEV_SERVER_URL, RENDERER_DIST, is_mac } from '../../main'
import { getCenterPositionBoundByRouter } from '../../utils/display'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class MainWindow implements TWindows {
	public instance: BrowserWindow | null = null

	public currentHotKey: string = ''

	routerName: T_SCREEN_SIZE_TYPE = 'NORMAL'

	isEditingHotKey: boolean = false

	constructor() {}

	create() {
		const { x, y } = getCenterPositionBoundByRouter(this.routerName)
		this.instance = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC || '', 'logo.png'),
			webPreferences: {
				preload: path.join(__dirname, 'preload.mjs'),
			},
			resizable: false,
			frame: false,
			alwaysOnTop: true,
			show: false,
			width: NORMAL_SCREEN_SIZE.width,
			height: NORMAL_SCREEN_SIZE.height,
			fullscreenable: false,
			x,
			y,
		})

		// Test active push message to Renderer-process.
		this.instance.webContents.on('did-finish-load', async () => {
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
			if (!is_mac) {
				initClipboard(this.instance!)
			} else {
				const auxiliaryPermission =
					await systemPreferences.isTrustedAccessibilityClient(false)
				if (auxiliaryPermission) {
					initClipboard(this.instance!)
				}
			}

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
		// 设置窗口位置并显示
		this.instance?.setVisibleOnAllWorkspaces(true, {
			visibleOnFullScreen: true,
			skipTransformProcessType: false,
		})
		// 确保窗口显示和焦点设置之间有足够的延迟
		setTimeout(() => {
			this.instance?.show()
			this.instance?.focus()
		}, 100)
		this.instance?.webContents.send('window-shown')
	}

	close() {
		this.instance?.setOpacity(0)
		this.instance?.hide()
	}

	shortcutCallback() {}
}

export const mainWindow = new MainWindow()
