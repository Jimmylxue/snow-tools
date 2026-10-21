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
import {
	base64ToolWindow,
	colorConvertWindow,
	hashToolWindow,
	radixWindow,
	timestampWindow,
} from './devTools'
import { initApps } from '../biz/apps'
import { initHosts } from '../biz/hosts'
import { initAutoLaunch } from '../biz/autoLaunch'
import { initJsonTool } from '../biz/jsonTool'
import { initSpotlight } from '../biz/spotlight'

export function initRouter(startHidden = false) {
	initApps()
	initHosts()
	initAutoLaunch()
	initJsonTool()
	initSpotlight()

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
	timestampWindow.create()
	radixWindow.create()
	colorConvertWindow.create()
	base64ToolWindow.create()
	hashToolWindow.create()

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
			timestamp: timestampWindow,
			radix: radixWindow,
			colorConvert: colorConvertWindow,
			base64Tool: base64ToolWindow,
			hashTool: hashToolWindow,
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
