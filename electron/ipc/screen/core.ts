import { BrowserWindow, ipcMain } from 'electron'
import { T_SCREEN_SIZE_TYPE } from './type'
import { SCREEN_SIZE_MAP } from './const'

export function screenEvent(mainWindow: BrowserWindow) {
	ipcMain.on('screen_size_event', (_, type: T_SCREEN_SIZE_TYPE) => {
		mainWindow.setResizable(true)
		const screen = SCREEN_SIZE_MAP[type]
		mainWindow.setSize(screen.width, screen.height)
		mainWindow.setResizable(false)
	})
}
