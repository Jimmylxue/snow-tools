import {
	BrowserWindow,
	dialog,
	globalShortcut,
	ipcMain,
	systemPreferences,
	shell,
} from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TWindows } from '../type'
import { getOpenWindowBound } from '../../ipc/window'
import { initClipboard } from '../../biz/clipboard'
import { currentScreen, screenEvent } from '../../ipc/screen'
import { VITE_DEV_SERVER_URL, RENDERER_DIST, is_mac } from '../../main'
import { getLocalStorageHotKey } from './hotkey'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class MainWindow implements TWindows {
	public instance: BrowserWindow | null = null

	public currentHotKey: string = ''

	isEditingHotKey: boolean = false

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
				this.instance?.webContents.send(
					'MAC_AUXILIARY_PERMISSION',
					auxiliaryPermission
				)
			}
		})
	}

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
			this.show()
			screenEvent(this.instance!)
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
		const { x, y } = getOpenWindowBound()
		this.instance?.setOpacity(1)
		// 设置窗口位置并显示
		this.instance?.setBounds({ x, y })
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
