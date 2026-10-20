import { registerGlobalShortCut } from '../config/shortcut'
import { appTray } from '../config/tray'
import { aboutWindow } from './about'
import { capturerWindow } from './capturer'
import { navigate, TRouterPage } from './core'
import { mainWindow } from './main'
import { ipcMain } from 'electron'
import { translateWindow } from './translate'
import { gitmojiWindow } from './gitmoji'
import { clipboardWindow } from './clipboard'
import { settingWindow } from './setting'
import { imageHostingWindow } from './imageHosting'
import { hostsWindow } from './hosts'
import { jsonToolWindow } from './jsonTool'
import { initApps } from '../biz/apps'
import { initHosts } from '../biz/hosts'
import { initAutoLaunch } from '../biz/autoLaunch'
import { initJsonTool } from '../biz/jsonTool'

export function initRouter(startHidden = false) {
	initApps()
	initHosts()
	initAutoLaunch()
	initJsonTool()

	mainWindow.create()
	capturerWindow.create()
	aboutWindow.create()
	translateWindow.create()
	gitmojiWindow.create()
	clipboardWindow.create()
	settingWindow.create()
	imageHostingWindow.create()
	hostsWindow.create()
	jsonToolWindow.create()

	appTray.initTray(mainWindow.instance!)
	navigate.register(
		{
			base: mainWindow,
			setting: settingWindow,
			capturer: capturerWindow,
			about: aboutWindow,
			translate: translateWindow,
			gitmoji: gitmojiWindow,
			clipboard: clipboardWindow,
			imageHosting: imageHostingWindow,
			hosts: hostsWindow,
			jsonTool: jsonToolWindow,
		},
		{ show: !startHidden },
	)

	registerGlobalShortCut()

	ipcMain.on('ROUTER_CLOSE', (_, type: TRouterPage) => {
		navigate.routerMap?.[type].close()
	})

	ipcMain.on('ROUTER_NAVIGATE', (_, type: TRouterPage) => {
		// navigate.routerMap?.[type].show()
		navigate.navigate(type)
	})

	ipcMain.on('ROUTER_ESC_BACK', () => {
		navigate.singleBack()
	})
}
