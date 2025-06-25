import { BrowserWindow, ipcMain, screen, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VITE_DEV_SERVER_URL, RENDERER_DIST, is_mac } from '../../main'
import { TCaptureSaveParams } from './type'
import { copyImageToClipboard, saveImageToSystem } from '../../utils/storage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class HoverWindows {
	public instances: Map<string, BrowserWindow> = new Map()

	constructor() {}

	generate(params: TCaptureSaveParams) {
		const { id, size, position } = params

		// 1. 获取当前鼠标所在显示器
		const mousePosition = screen.getCursorScreenPoint()
		const targetDisplay = screen.getDisplayNearestPoint(mousePosition)

		// 2. 计算在目标显示器上的绝对位置
		const absoluteX = targetDisplay.bounds.x + position.x
		const absoluteY = targetDisplay.bounds.y + position.y

		const instance = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
			webPreferences: {
				preload: path.join(__dirname, 'preload.mjs'),
				additionalArguments: [`--window-id=${id}`],
			},
			resizable: false,
			frame: false,
			alwaysOnTop: true,
			show: false,
			fullscreenable: false,
			roundedCorners: true, // 需要设置为true才能显示阴影
			width: size.width,
			height: size.height,
			x: absoluteX,
			y: absoluteY,
		})

		instance.setVisibleOnAllWorkspaces(true, {
			visibleOnFullScreen: true,
			skipTransformProcessType: true,
		})

		this.instances.set(id, instance)

		instance.webContents.on('did-finish-load', () => {
			instance.webContents.executeJavaScript(
				`window.location.hash = '#/capturer/hover'`
			)
			instance.webContents.send('window-init', { params })

			instance.webContents.openDevTools()

			// 确保窗口在正确位置
			instance.setBounds({
				x: absoluteX,
				y: absoluteY,
				width: size.width,
				height: size.height,
			})

			instance.show()
			instance.focus()
		})

		if (VITE_DEV_SERVER_URL) {
			instance.loadURL(VITE_DEV_SERVER_URL)
		} else {
			instance.loadFile(path.join(RENDERER_DIST, 'index.html'))
		}

		ipcMain.on(`window-move-${id}`, (_, { x, y }) => {
			instance.setPosition(x, y)
			if (!is_mac) {
				// 💩 windows 端 拖动会触发缩放  需要多设置一次
				instance.setBounds({
					width: size.width,
					height: size.height,
				})
			}
		})

		const menu = Menu.buildFromTemplate([
			{
				label: '复制图像',
				click: () => {
					copyImageToClipboard(params.source)
				},
			},
			{
				label: '图像另存为',
				click: async () => {
					await saveImageToSystem(params.source, instance)
				},
			},
			{ type: 'separator' },
			{
				label: '关闭',
				click: () => {
					instance.close()
				},
			},
		])

		// 右键菜单事件
		instance.webContents.on('context-menu', e => {
			e.preventDefault()
			menu?.popup({ window: instance })
		})

		ipcMain.on(`window-close-${id}`, () => {
			ipcMain.removeAllListeners(`window-move-${id}`)
			instance.close()
			this.instances.delete(id)
		})

		ipcMain.on(`window--${id}`, () => {
			ipcMain.removeAllListeners(`window-move-${id}`)
			instance.close()
			this.instances.delete(id)
		})
	}
}

export const hoverWindows = new HoverWindows()
