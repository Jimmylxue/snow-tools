import { appTray } from '../config/tray'
import { aboutWindow } from './about'
import { capturerWindow } from './capturer'
import { navigate, TRouterPage } from './core'
import { mainWindow } from './main'
import { ipcMain } from 'electron'

export function initRouter() {
	mainWindow.create()
	capturerWindow.create()
	aboutWindow.create()

	/**
	 * 注册 Tray
	 */
	appTray.initTray(mainWindow.instance!)

	navigate.register({
		base: mainWindow,
		setting: mainWindow,
		capturer: capturerWindow,
		about: aboutWindow,
	})

	ipcMain.on('ROUTER_CLOSE', (_, type: TRouterPage) => {
		navigate.routerMap?.[type].close()
	})
}
