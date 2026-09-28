import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
// on() 会把监听函数包一层，off() 必须拿回同一个包装函数才移得掉
type TIpcListener = Parameters<typeof ipcRenderer.on>[1]

const wrappedListeners = new WeakMap<TIpcListener, TIpcListener>()

contextBridge.exposeInMainWorld('ipcRenderer', {
	on(...args: Parameters<typeof ipcRenderer.on>) {
		const [channel, listener] = args
		const wrapper: TIpcListener = (event, ...rest) => listener(event, ...rest)
		wrappedListeners.set(listener, wrapper)
		return ipcRenderer.on(channel, wrapper)
	},
	off(...args: Parameters<typeof ipcRenderer.off>) {
		const [channel, listener] = args
		return ipcRenderer.off(
			channel,
			wrappedListeners.get(listener) ?? listener,
		)
	},
	send(...args: Parameters<typeof ipcRenderer.send>) {
		const [channel, ...omit] = args
		return ipcRenderer.send(channel, ...omit)
	},
	invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
		const [channel, ...omit] = args
		return ipcRenderer.invoke(channel, ...omit)
	},

	// You can expose other APTs you need here.
	// ...
	getWindowId: () => {
		return process.argv
			.find(arg => arg.startsWith('--window-id='))
			?.split('=')[1]
	},

	openExternal: (url: string) => {
		return ipcRenderer.invoke('open-external', url)
	},

	getInstalledApps: () => {
		return ipcRenderer.invoke('getInstalledApps')
	},
})
