import { BrowserWindow, globalShortcut } from 'electron'

export function registerHotKey(mainWindow: BrowserWindow) {
	// 注册热键
	const isMac = process.platform === 'darwin'
	const toggleScreen = isMac ? 'Command+J' : 'Ctrl+J'
	globalShortcut.register(toggleScreen, () => {
		if (mainWindow.isVisible()) {
			mainWindow.hide() // 隐藏窗口
		} else {
			mainWindow.show() // 显示窗口
			mainWindow.webContents.send('window-shown')
		}
	})
}
