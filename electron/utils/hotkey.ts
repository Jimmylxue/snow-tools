import { BrowserWindow } from 'electron'

export async function getLocalStorageHotKey(mainWindow: BrowserWindow) {
	const hotkey = await mainWindow.webContents.executeJavaScript(
		`localStorage.getItem('snow-tools-hotkey') || (navigator.platform.includes('Mac') ? '${
			import.meta.env.VITE_APP_MAC_OPEN_HOT_KEY
		}' : '${import.meta.env.VITE_APP_WINDOWS_OPEN_HOT_KEY}')`
	)
	return hotkey
}
