import { TCaptureSaveParams } from 'electron/router/capturer/type'
import { useEffect, useState } from 'react'

let latestCustomData: {
	params: TCaptureSaveParams
}

window.ipcRenderer.on('window-init', (_, data) => {
	// 这里的 data 只属于当前窗口
	latestCustomData = data
})

export function useElectron() {
	const [windowId, setWindowId] = useState<string | null>(null)
	const [customData, setCustomData] = useState<typeof latestCustomData>()

	useEffect(() => {
		if (window.ipcRenderer) {
			setWindowId(window.ipcRenderer?.getWindowId() || null)
		}
	}, [])

	useEffect(() => {
		if (latestCustomData) {
			setCustomData(latestCustomData)
		}

		const handleWindowInit = (_: unknown, data: typeof latestCustomData) => {
			latestCustomData = data
			setCustomData(data)
		}

		window.ipcRenderer.on('window-init', handleWindowInit)
		return () => {
			window.ipcRenderer.off('window-init', handleWindowInit)
		}
	}, [])

	return { windowId, customData }
}
