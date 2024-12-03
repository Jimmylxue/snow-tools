import { useIpc } from '.'

const ipc = useIpc()

export function sendWindowSizeEvent(type: 'show' | 'close') {
	ipc.send('search-input-event', type)
}

export function listenScreen() {
	const windowShownFn = () => {
		document.getElementById('commandBarInput')?.focus()
	}
	ipc.on('window-shown', windowShownFn)
	return () => {
		ipc.off('window-shown', windowShownFn)
	}
}
