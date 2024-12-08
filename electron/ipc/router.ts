import { BrowserWindow, ipcMain } from 'electron'

type TRouterPage = 'base' | 'setting'

type TRouterMap = {
	[key in TRouterPage]: BrowserWindow
}

export let currentRouter: TRouterPage = 'base'

export function routerEvent(routerMap: TRouterMap, app: Electron.App) {
	ipcMain.on(
		'window-page-event',
		(
			_,
			{
				routerName,
				type,
			}: {
				routerName: TRouterPage
				type: 'show' | 'hide'
			}
		) => {
			const routerScreen = routerMap[routerName]
			if (type === 'show') {
				currentRouter = routerName
				routerScreen.setOpacity(1)
				routerScreen?.focus()
				routerScreen?.show()
				// if (currentRouter === 'setting') {
				// 	routerScreen.webContents.send('setting-window-shown')
				// }
			} else {
				routerScreen.setOpacity(0)
				routerScreen?.hide()
			}
		}
	)
}
