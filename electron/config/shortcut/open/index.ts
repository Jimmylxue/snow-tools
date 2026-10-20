import { globalShortcut, ipcMain } from 'electron'
import { EShortCutKey, TShortCut } from '../type'
import {
	getLocalStorageHotKeyByKeyName,
	notifyHotKeyRegisterFailed,
} from '../utils'
import { navigate } from '../../../router/core'
import { isCaptureSessionActive } from '../../../router/capturer/session'

class OpenShortCut implements TShortCut {
	shortcutKey = EShortCutKey.软件开启

	isEditingHotKey: boolean = false

	currentHotKey: string = ''

	constructor() {
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
	}

	register() {
		this.updateHotKey()
	}

	private async updateHotKey() {
		const hotkey = await getLocalStorageHotKeyByKeyName(this.shortcutKey)
		if (hotkey === this.currentHotKey) return

		if (this.currentHotKey) {
			globalShortcut.unregister(this.currentHotKey)
			this.currentHotKey = ''
		}

		try {
			// 注册新的热键
			const registered = globalShortcut.register(hotkey, () => {
				/** 截屏期间不接受唤醒，保持遮罩独占屏幕 */
				if (isCaptureSessionActive()) {
					const capturer = navigate.routerMap?.capturer.instance
					if (capturer?.isVisible()) {
						capturer.focus()
					}
					return
				}

				const openWindow = navigate.routerMap![navigate.currentRouter]
				const openWindowInstance = openWindow.instance!
				if (openWindowInstance?.isVisible()) {
					if (this.isEditingHotKey) return
					openWindowInstance?.setOpacity(0)
					openWindowInstance?.hide()
				} else {
					openWindow.show()
				}
			})

			if (!registered) {
				console.error(`Failed to register hotkey: ${hotkey}`)
				notifyHotKeyRegisterFailed({ type: 'OPEN', hotkey })
				return
			}

			this.currentHotKey = hotkey
			console.log(`Hotkey updated to: ${hotkey}`)
		} catch (error) {
			console.error('Failed to register hotkey:', error)
			notifyHotKeyRegisterFailed({ type: 'OPEN', hotkey })
		}
	}

	destroy() {}
}

export const openShortCut = new OpenShortCut()
