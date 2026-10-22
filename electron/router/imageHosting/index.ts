import { BrowserWindow, screen } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { VITE_DEV_SERVER_URL, RENDERER_DIST } from '../../main'
import {
	IMAGE_HOSTING_SETTING_SCREEN_SIZE,
	T_SCREEN_SIZE_TYPE,
} from '../../ipc/screen'
import { getCenterPositionBoundByRouter } from '../../utils/display'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class ImageHostingWindow implements TWindows {
	public instance: BrowserWindow | null = null

	routerName: T_SCREEN_SIZE_TYPE = 'IMAGE_HOSTING'

	private hasShown = false

	constructor() {}

	create(onLoad?: () => void) {
		const { x, y } = getCenterPositionBoundByRouter(this.routerName)

		this.instance = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC || '', 'logo.png'),
			webPreferences: {
				preload: path.join(__dirname, 'preload.mjs'),
				contextIsolation: true,
			},
			resizable: true,
			frame: false,
			alwaysOnTop: true,
			show: false,
			fullscreenable: true,
			width: IMAGE_HOSTING_SETTING_SCREEN_SIZE.width,
			height: IMAGE_HOSTING_SETTING_SCREEN_SIZE.height,
			minWidth: 760,
			minHeight: 480,
			x,
			y,
		})

		// Test active push message to Renderer-process.
		this.instance.webContents.on('did-finish-load', () => {
			this.instance?.webContents.executeJavaScript(
				`window.location.hash = '#/imageHosting';`
			)
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
		// this.instance?.webContents.openDevTools()

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
		const instance = this.instance
		if (!instance) return

		if (!this.hasShown) {
			const { x, y } = getCenterPositionBoundByRouter(this.routerName)
			instance.setBounds({ x, y })
			this.hasShown = true
		} else {
			/** 拖动后保持位置；完全移出屏幕时才重新居中 */
			const bounds = instance.getBounds()
			const { workArea } = screen.getDisplayMatching(bounds)
			const visible =
				bounds.x < workArea.x + workArea.width - 80 &&
				bounds.x + bounds.width > workArea.x + 80 &&
				bounds.y < workArea.y + workArea.height - 80 &&
				bounds.y + bounds.height > workArea.y + 80

			if (!visible) {
				const { x, y } = getCenterPositionBoundByRouter(this.routerName)
				instance.setBounds({ x, y })
			}
		}

		instance.setVisibleOnAllWorkspaces(true, {
			visibleOnFullScreen: true,
			skipTransformProcessType: true,
		})
		instance.setOpacity(1)
		instance.show()
		instance.focus()
	}

	close() {
		this.instance?.hide()
	}

	shortcutCallback() {}
}

export const imageHostingWindow = new ImageHostingWindow()
