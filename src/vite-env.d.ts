/// <reference types="vite/client" />
interface Window {
	ipcRenderer: import('electron').IpcRenderer & {
		getWindowId: () => string | undefined
		openExternal: (url: string) => void
		// getInstalledApps: () => Promise<TApp[]>
	}
}
