import { BrowserWindow, ipcMain } from 'electron'

export function screenEvent(mainWindow: BrowserWindow) {
	ipcMain.on('search-input-event', (_, type) => {
		if (type === 'show') {
			mainWindow.setSize(600, 300)
		} else {
			mainWindow.setSize(600, 62)
		}
	})
}
