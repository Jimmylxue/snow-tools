import { BrowserWindow, ipcMain } from 'electron'

type TRouterPage = 'base' | 'setting'

type TRouterMap = {
	[key in TRouterPage]: BrowserWindow
}

export let currentRouter: TRouterPage = 'base'

export function routerEvent(routerMap: TRouterMap) {
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
			if (type === 'show') {
				routerMap[routerName]?.show()
			} else {
				routerMap[routerName]?.hide()
			}
		}
	)
}
