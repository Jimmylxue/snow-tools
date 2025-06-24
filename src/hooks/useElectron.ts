import { TCaptureSaveParams } from 'electron/router/capturer/type'
import { useEffect, useState } from 'react'

let customData: {
	params: TCaptureSaveParams
}

window.ipcRenderer.on('window-init', (_, data) => {
	// 这里的 data 只属于当前窗口
	customData = data
})

export function useElectron() {
	const [windowId, setWindowId] = useState<string | null>(null)

	useEffect(() => {
		if (window.ipcRenderer) {
			setWindowId(window.ipcRenderer?.getWindowId() || null)
		}
	}, [])

	useEffect(() => {}, [])

	return { windowId, customData }
}
