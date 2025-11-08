import {
	BrowserWindow,
	dialog,
	ipcMain,
	shell,
	systemPreferences,
} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { VITE_DEV_SERVER_URL, RENDERER_DIST, is_mac } from '../../main'
import {
	CLIPBOARD_HISTORY_PAGE_SIZE,
	T_SCREEN_SIZE_TYPE,
} from '../../ipc/screen'
import { getCenterPositionBoundByRouter } from '../../utils/display'
import { initClipboard } from '../../biz/clipboard'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class ClipboardWindow implements TWindows {
	public instance: BrowserWindow | null = null

	routerName: T_SCREEN_SIZE_TYPE = 'CLIPBOARD'

	constructor() {
		ipcMain.on('REQUIRE_PERMISSION', async () => {
			if (is_mac) {
				const auxiliaryPermission =
					await systemPreferences.isTrustedAccessibilityClient(false)
				if (auxiliaryPermission && this.instance) {
					initClipboard(this.instance)
				}
				if (!auxiliaryPermission) {
					// 使用 dialog 显示原生弹窗
					const { response } = await dialog.showMessageBox({
						type: 'warning',
						title: '需要辅助功能权限',
						message: 'snow-tools 需要辅助功能权限才能正常工作',
						detail:
							'请前往系统偏好设置 > 安全性与隐私 > 隐私 > 辅助功能，然后添加 snow-tools。',
						buttons: ['稍后', '立即前往'],
						defaultId: 1,
						cancelId: 0,
					})
					// 如果用户点击"立即前往"
					if (response === 1) {
						shell.openExternal(
							'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
						)
					}
				}
				console.log('auxiliaryPermission', auxiliaryPermission)
				this.instance?.webContents.send(
					'MAC_AUXILIARY_PERMISSION',
					auxiliaryPermission
				)
			}
		})
	}

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
			width: CLIPBOARD_HISTORY_PAGE_SIZE.width,
			height: CLIPBOARD_HISTORY_PAGE_SIZE.height,
			x,
			y,
		})

		// Test active push message to Renderer-process.
		this.instance.webContents.on('did-finish-load', () => {
			this.instance?.webContents.executeJavaScript(
				`window.location.hash = '#/clipboard';`
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

export const clipboardWindow = new ClipboardWindow()
