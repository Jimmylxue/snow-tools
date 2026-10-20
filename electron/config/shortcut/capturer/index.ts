import { globalShortcut, ipcMain } from 'electron'
import { EShortCutKey, TShortCut } from '../type'
import {
	getLocalStorageHotKeyByKeyName,
	notifyHotKeyRegisterFailed,
} from '../utils'
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
			this.currentHotKey = ''
		}
		const window = navigate.routerMap!.capturer
		try {
			const registered = globalShortcut.register(
				hotkey,
				window.shortcutCallback,
			)

			if (!registered) {
				console.error(`Failed to register hotkey: ${hotkey}`)
				notifyHotKeyRegisterFailed({ type: 'CAPTURER', hotkey })
				return
			}

			this.currentHotKey = hotkey
			console.log(`Capturer Hotkey updated to: ${hotkey}`)
		} catch (error) {
			console.error('Failed to register hotkey:', error)
			notifyHotKeyRegisterFailed({ type: 'CAPTURER', hotkey })
		}
	}

	destroy() {}
}

export const capturerShortCut = new CapturerShortCut()
