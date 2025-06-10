import { BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { showWindow } from '../window'
import { T_HOT_KEY_TYPE } from './type'
import { HOT_KEY_EVENT_NAME } from './const'

let currentHotkey = ''
/**
 * 是否正在修改热键 如果在修改的状态下 按了快捷键是不会
 */
let isEditHotKey: boolean = false

export function registerHotKey(mainWindow: BrowserWindow) {
	updateHotkeyFromStorage(mainWindow)

	ipcMain.on(HOT_KEY_EVENT_NAME, (_, type: T_HOT_KEY_TYPE) => {
		if (type === 'EDITING_OPEN_HOT_KEY') {
			isEditHotKey = true
			currentHotkey = ''
			unregisterAllHotkeys()
		} else {
			isEditHotKey = false
			updateHotkeyFromStorage(mainWindow)
		}
	})
}

function updateHotkeyFromStorage(mainWindow: BrowserWindow) {
	// 从 localStorage 获取热键设置
	mainWindow.webContents
		.executeJavaScript(
			`localStorage.getItem('snow-tools-hotkey') || (navigator.platform.includes('Mac') ? 'Command+K' : 'Ctrl+K')`
		)
		.then((hotkey: string) => {
			// 如果热键没有变化，则不做任何操作
			if (hotkey === currentHotkey) return

			// 注销旧的热键
			if (currentHotkey) {
				globalShortcut.unregister(currentHotkey)
			}

			try {
				// 注册新的热键
				globalShortcut.register(hotkey, () => {
					if (mainWindow.isVisible()) {
						if (isEditHotKey) return
						mainWindow.setOpacity(0)
						mainWindow.hide()
					} else {
						mainWindow.setOpacity(1)
						mainWindow.focus()
						showWindow(mainWindow)
						mainWindow.webContents.send('window-shown')
					}
				})

				currentHotkey = hotkey
				console.log(`Hotkey updated to: ${hotkey}`)
			} catch (error) {
				console.error('Failed to register hotkey:', error)
				// 可以在这里通知渲染进程注册失败
				mainWindow.webContents.send('hotkey-register-failed', hotkey)
			}
		})
}

// 提供一个方法来获取当前热键（可选）
export function getCurrentHotkey(): string {
	return currentHotkey
}

// 在应用退出时注销所有快捷键（推荐）
export function unregisterAllHotkeys() {
	globalShortcut.unregisterAll()
}
