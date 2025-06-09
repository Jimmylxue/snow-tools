import { T_SCREEN_SIZE_TYPE } from 'electron/ipc/screen'
import { useIpc } from '.'

const ipc = useIpc()

export function sendWindowSizeEvent(type: T_SCREEN_SIZE_TYPE) {
	ipc.send('screen_size_event', type)
}

type TWindowChangeParams = {
	routerName: 'base' | 'setting'
	type: 'show' | 'hide'
}

export function sendRouterChangeEvent(params: TWindowChangeParams) {
	ipc.send('window-page-event', params)
}

export function listenScreen() {
	const windowShownFn = () => {
		document.getElementById('baseCommandInput')?.focus()
	}
	ipc.on('window-shown', windowShownFn)
	return () => {
		ipc.off('window-shown', windowShownFn)
	}
}
