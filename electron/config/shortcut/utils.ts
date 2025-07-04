import { navigate } from '../../router/core'

export async function getLocalStorageHotKeyByKeyName(keyName: string) {
	const mainWindow = navigate.routerMap!.base.instance!

	const hotkey = await mainWindow.webContents.executeJavaScript(
		`localStorage.getItem('${keyName}') || (navigator.platform.includes('Mac') ? '${
			import.meta.env.VITE_APP_MAC_OPEN_HOT_KEY
		}' : '${import.meta.env.VITE_APP_WINDOWS_OPEN_HOT_KEY}')`
	)
	await mainWindow.webContents.executeJavaScript(
		`localStorage.setItem('${keyName}', "${hotkey}")`
	)
	return hotkey
}
