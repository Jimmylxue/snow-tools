import { TCopyItem } from './type'
import { BrowserWindow } from 'electron'

let preText: string = ''

export function copyCallBack(mainWindow: BrowserWindow, text: string) {
	if (preText === text) {
		return
	}
	preText = text

	const copyItem: TCopyItem = {
		text: preText,
		date: Date.now(),
		type: 'TEXT',
		isCollect: false,
	}
	mainWindow.webContents.send('CLIPBOARD_CHANGED', copyItem)
}
