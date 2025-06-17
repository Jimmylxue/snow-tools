import { BrowserWindow, ipcMain } from 'electron'
import { T_SCREEN_SIZE_TYPE, T_SCREEN_VALUE } from './type'
import { NORMAL_SCREEN_SIZE, SCREEN_SIZE_MAP } from './const'

export let currentScreen: {
	type: T_SCREEN_SIZE_TYPE
	value: T_SCREEN_VALUE
} = {
	type: 'NORMAL',
	value: NORMAL_SCREEN_SIZE,
}

export function screenEvent(mainWindow: BrowserWindow) {
	ipcMain.on('screen_size_event', (_, type: T_SCREEN_SIZE_TYPE) => {
		mainWindow.setResizable(true)
		const screen = SCREEN_SIZE_MAP[type]
		currentScreen = {
			type,
			value: screen,
		}
		mainWindow.setSize(screen.width, screen.height)
		mainWindow.setResizable(false)
	})
}
