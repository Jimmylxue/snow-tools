import { globalShortcut, ipcMain } from 'electron'
import { EShortCutKey, TShortCut } from '../type'
import { getLocalStorageHotKeyByKeyName } from '../utils'
import { navigate } from '../../../router/core'

class CapturerShortCut implements TShortCut {
	shortcutKey = EShortCutKey.截屏

	isEditingHotKey: boolean = false

	currentHotKey: string = ''

	constructor() {}

	register() {
		ipcMain.on('EDITING_CAPTURER_HOT_KET_COMPLETE', () => {
			this.isEditingHotKey = false
			this.updateHotKey()
		})

		ipcMain.on('EDITING_CAPTURER_HOT_KEY', () => {
			this.isEditingHotKey = true
			globalShortcut.unregister(this.currentHotKey)
			this.currentHotKey = ''
		})

		this.updateHotKey()
	}

	async updateHotKey() {
		const hotkey = await getLocalStorageHotKeyByKeyName(this.shortcutKey)
		if (hotkey === this.currentHotKey) return

		if (this.currentHotKey) {
			globalShortcut.unregister(this.currentHotKey)
		}
		const window = navigate.routerMap!.capturer
		const windowInstance = window.instance!
		try {
			globalShortcut.register(hotkey, window.shortcutCallback)
			this.currentHotKey = hotkey
			console.log(`Capturer Hotkey updated to: ${hotkey}`)
		} catch (error) {
			console.error('Failed to register hotkey:', error)
			// 可以在这里通知渲染进程注册失败
			windowInstance?.webContents.send(
				'hotkey-register-capturer_failed',
				hotkey
			)
		}
	}

	destroy() {}
}

export const capturerShortCut = new CapturerShortCut()
