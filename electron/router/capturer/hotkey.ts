import { BrowserWindow } from 'electron'

export async function getLocalStorageHotKey(mainWindow: BrowserWindow) {
	const hotkey = await mainWindow.webContents.executeJavaScript(
		`localStorage.getItem('snow-tools-capturer_hotkey') || (navigator.platform.includes('Mac') ? '${
			import.meta.env.VITE_APP_MAC_CAPTURER_HOT_KEY
		}' : '${import.meta.env.VITE_APP_WINDOWS_CAPTURER_HOT_KEY}')`
	)
	await mainWindow.webContents.executeJavaScript(
		`localStorage.setItem('snow-tools-capturer_hotkey', "${hotkey}")`
	)
	return hotkey
}
