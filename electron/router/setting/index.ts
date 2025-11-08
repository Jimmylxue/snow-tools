import { BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { VITE_DEV_SERVER_URL, RENDERER_DIST } from '../../main'
import {
	SYSTEM_SETTING_SCREEN_SIZE,
	T_SCREEN_SIZE_TYPE,
} from '../../ipc/screen'
import { getCenterPositionBoundByRouter } from '../../utils/display'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class SettingWindow implements TWindows {
	public instance: BrowserWindow | null = null

	routerName: T_SCREEN_SIZE_TYPE = 'SETTING'

	constructor() {}

	create(onLoad?: () => void) {
		const { x, y } = getCenterPositionBoundByRouter(this.routerName)

		this.instance = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC || '', 'logo.png'),
			webPreferences: {
				preload: path.join(__dirname, 'preload.mjs'),
				contextIsolation: true,
			},
			resizable: false,
			frame: false,
			alwaysOnTop: true,
			show: false,
			fullscreenable: true,
			width: SYSTEM_SETTING_SCREEN_SIZE.width,
			height: SYSTEM_SETTING_SCREEN_SIZE.height,
			x,
			y,
		})

		// Test active push message to Renderer-process.
		this.instance.webContents.on('did-finish-load', () => {
			this.instance?.webContents.executeJavaScript(
				`window.location.hash = '#/setting';`
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
		const { x, y } = getCenterPositionBoundByRouter(this.routerName)
		this.instance?.setBounds({
			x,
			y,
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
		this.instance?.hide()
	}

	shortcutCallback() {}
}

export const settingWindow = new SettingWindow()
