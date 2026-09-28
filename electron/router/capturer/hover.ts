import { BrowserWindow, ipcMain, screen, Menu } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VITE_DEV_SERVER_URL, RENDERER_DIST, is_mac } from '../../main'
import { TCaptureSaveParams } from './type'
import { copyImageToClipboard, saveImageToSystem } from '../../utils/storage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

type THoverWindow = {
	params: TCaptureSaveParams
	window: BrowserWindow
}

class HoverWindows {
	public instances: Map<string, THoverWindow> = new Map()

	constructor() {
		ipcMain.on('SHOW_HOVER_SCREEN', (_, windowId: string) => {
			const hoverWindow = this.instances.get(windowId)
			const instance = hoverWindow?.window
			if (instance) {
				const { position, size } = hoverWindow.params

				// 1. 获取当前鼠标所在显示器
				const mousePosition = screen.getCursorScreenPoint()
				const targetDisplay = screen.getDisplayNearestPoint(mousePosition)

				// 2. 计算在目标显示器上的绝对位置
				const absoluteX = targetDisplay.bounds.x + position.x
				const absoluteY = targetDisplay.bounds.y + position.y

				// 确保窗口在正确位置
				instance.setBounds({
					x: absoluteX,
					y: absoluteY,
					width: size.width,
					height: size.height,
				})

				instance.setVisibleOnAllWorkspaces(true, {
					visibleOnFullScreen: true,
					skipTransformProcessType: true,
				})
				instance.show()
				setTimeout(() => {
					instance.focus()
				}, 10)
			}
		})

		ipcMain.on(`HOVER_CAPTURER_SCREEN_CLOSE`, (_, windowId: string) => {
			const hoverWindow = this.instances.get(windowId)
			const instance = hoverWindow?.window
			ipcMain.removeAllListeners(`window-move-${windowId}`)
			instance?.close()
			this.instances.delete(windowId)
		})
	}

	generate(params: TCaptureSaveParams) {
		const { id, size } = params

		const instance = new BrowserWindow({
			icon: path.join(process.env.VITE_PUBLIC || '', 'logo.png'),
			webPreferences: {
				preload: path.join(__dirname, 'preload.mjs'),
				additionalArguments: [`--window-id=${id}`],
				// 添加以下配置改善渲染
				backgroundThrottling: false,
				contextIsolation: true,
				nodeIntegration: false,
			},
			resizable: false,
			frame: false,
			alwaysOnTop: true,
			show: false,
			fullscreenable: false,
			roundedCorners: true,
			width: size.width,
			height: size.height,
			// 渲染层按 18px 圆角裁图，窗口必须真透明，否则圆角外会露出窗口底色形成黑角
			backgroundColor: '#00000000',
			transparent: true,
			hasShadow: true,
			thickFrame: false,
			paintWhenInitiallyHidden: false,
			enableLargerThanScreen: false,
		})

		this.instances.set(id, {
			params,
			window: instance,
		})

		instance.webContents.on('did-finish-load', () => {
			instance.webContents.executeJavaScript(
				`window.location.hash = '#/capturer/hover'`
			)
			instance.webContents.send('window-init', { params })

			if (import.meta.env.VITE_APP_OPEN_DEV_TOOLS === 'true') {
				instance?.webContents.openDevTools()
			}
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

		ipcMain.on(`WINDOW-RESIZE-${id}`, (_, isMagnify: boolean) => {
			const hoverWindow = this.instances.get(id)
			const instance = hoverWindow?.window
			const { size: originalSize } = hoverWindow?.params || {
				size: { width: 0, height: 0 },
			}

			if (!instance || !originalSize) return

			// 获取当前窗口尺寸和位置
			const [currentWidth, currentHeight] = instance.getSize()
			const [currentX, currentY] = instance.getPosition()

			// 定义缩放比例
			const zoomFactor = 0.03

			// 计算新尺寸
			const newWidth = Math.round(
				isMagnify
					? currentWidth + originalSize.width * zoomFactor
					: currentWidth - originalSize.width * zoomFactor
			)
			const newHeight = Math.round(
				isMagnify
					? currentHeight + originalSize.height * zoomFactor
					: currentHeight - originalSize.height * zoomFactor
			)

			if (!isMagnify && (newWidth < 50 || newHeight < 50)) {
				return
			}

			// 计算中心点位置
			const centerX = currentX + currentWidth / 2
			const centerY = currentY + currentHeight / 2

			// 计算新位置（保持中心点不变）
			const newX = Math.round(centerX - newWidth / 2)
			const newY = Math.round(centerY - newHeight / 2)

			// 设置新尺寸和位置
			instance.setSize(newWidth, newHeight)
			instance.setPosition(newX, newY)

			// Windows特殊处理
			// if (!is_mac) {
			// 	instance.setBounds({
			// 		x: newX,
			// 		y: newY,
			// 		width: newWidth,
			// 		height: newHeight,
			// 	})
			// }
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
	}
}

export const hoverWindows = new HoverWindows()
