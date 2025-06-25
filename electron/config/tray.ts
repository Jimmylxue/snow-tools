import { app, BrowserWindow, nativeImage, Tray, Menu } from 'electron'
import fs from 'fs'
import path from 'path'

export class AppTray {
	private static instance: AppTray | null = null
	private tray: Tray | null = null
	private mainWindow: BrowserWindow | null = null
	private isDev: boolean = !app.isPackaged

	private constructor() {}

	// 单例模式获取实例
	public static getInstance(): AppTray {
		if (!AppTray.instance) {
			AppTray.instance = new AppTray()
		}
		return AppTray.instance
	}

	public initTray(mainWindow: BrowserWindow) {
		this.mainWindow = mainWindow

		// 开发模式下先清理可能的残留
		if (this.isDev) {
			this.destroy()
		}

		try {
			const iconPath = this.getIconPath()
			console.log('Tray icon path:', iconPath)

			if (!fs.existsSync(iconPath)) {
				throw new Error(`Tray icon not found at: ${iconPath}`)
			}

			let trayIcon = nativeImage.createFromPath(iconPath)
			if (trayIcon.isEmpty()) {
				throw new Error('Failed to load tray icon')
			}

			// 平台特定调整
			if (process.platform === 'darwin') {
				trayIcon = trayIcon.resize({ width: 22, height: 22 })
			} else {
				trayIcon = trayIcon.resize({ width: 32, height: 32 })
			}

			// 创建系统托盘
			this.tray = new Tray(trayIcon)
			this.tray.setToolTip(app.name)

			this.updateContextMenu()
			this.setupClickEvents()

			// 开发模式下添加退出清理
			if (this.isDev) {
				this.setupDevCleanup()
			}
		} catch (error) {
			console.error('Tray initialization failed:', error)
		}
	}

	private setupDevCleanup() {
		// 监听应用退出
		app.on('will-quit', () => {
			this.destroy()
		})

		// 监听渲染进程重载
		this.mainWindow?.webContents.on('render-process-gone', () => {
			this.destroy()
		})
	}

	private getIconPath(): string {
		const iconName =
			process.platform === 'darwin' ? 'tray-icon-mac.png' : 'tray-icon-win.png'

		if (this.isDev) {
			return path.join(process.env.VITE_PUBLIC || '', iconName)
		}

		// 生产环境路径
		if (process.platform === 'darwin') {
			// macOS 正确路径获取方式
			return path.join(
				process.resourcesPath, // 直接使用 Electron 提供的资源路径
				iconName
			)
		} else {
			// Windows 路径
			return path.join(path.dirname(app.getPath('exe')), 'resources', iconName)
		}
	}

	private updateContextMenu() {
		if (!this.tray) return

		const contextMenu = Menu.buildFromTemplate([
			{
				label: '打开/隐藏',
				click: () => this.toggleWindow(),
			},
			{
				label: '重启应用',
				click: () => this.restartApp(),
			},
			{ type: 'separator' },
			{
				label: '退出',
				click: () => this.quitApp(),
			},
		])

		this.tray.setContextMenu(contextMenu)
	}

	private setupClickEvents() {
		if (!this.tray) return

		this.tray.on('click', () => {
			if (process.platform === 'darwin') {
				this.tray?.popUpContextMenu()
			} else {
				this.toggleWindow()
			}
		})

		if (process.platform !== 'darwin') {
			this.tray.on('right-click', () => {
				this.tray?.popUpContextMenu()
			})
		}
	}

	private toggleWindow() {
		if (!this.mainWindow) return

		if (this.mainWindow.isVisible()) {
			this.mainWindow.hide()
		} else {
			this.mainWindow.show()
			this.mainWindow.focus()
		}
	}

	private quitApp() {
		this.destroy()
		app.quit()
	}

	private restartApp() {
		this.destroy()
		app.relaunch()
		app.exit(0)
	}

	public destroy() {
		if (this.tray) {
			this.tray.destroy()
			this.tray = null
		}
	}
}

// 导出单例
export const appTray = AppTray.getInstance()
