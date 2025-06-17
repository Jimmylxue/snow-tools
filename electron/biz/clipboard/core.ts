import { TCopyItem } from './type'
import { BrowserWindow } from 'electron'

let preTextList: string[] = []
export function copyCallBack(mainWindow: BrowserWindow, text: string) {
	if (text.trim() === '') {
		return
	}
	if (preTextList.includes(text)) {
		return
	}
	preTextList.push(text)
	if (preTextList.length === 20) {
		preTextList = preTextList.slice(1)
	}

	const copyItem: TCopyItem = {
		content: text,
		createdTime: Date.now(),
		type: 'TEXT',
		isCollect: false,
	}
	mainWindow.webContents.send('CLIPBOARD_CHANGED', copyItem)
}
