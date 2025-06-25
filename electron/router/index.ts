import { appTray } from '../config/tray'
import { capturerWindow } from './capturer'
import { navigate, TRouterPage } from './core'
import { mainWindow } from './main'
import { ipcMain } from 'electron'

export function initRouter() {
	mainWindow.create()
	capturerWindow.create()

	/**
	 * 注册 Tray
	 */
	appTray.initTray(mainWindow.instance!)

	navigate.register({
		base: mainWindow,
		setting: mainWindow,
		capturer: capturerWindow,
	})

	ipcMain.on('ROUTER_CLOSE', (_, type: TRouterPage) => {
		navigate.routerMap?.[type].close()
	})
}
