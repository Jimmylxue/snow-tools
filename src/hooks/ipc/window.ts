import { T_SCREEN_SIZE_TYPE } from 'electron/ipc/screen'
import { useIpc } from '.'
import { TRouterPage } from 'electron/router/core'

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

export function sendHideWindowEvent() {
	ipc.send('screen_close_event')
}

export function sendRouterClose(router: TRouterPage) {
	ipc.send('ROUTER_CLOSE', router)
}

export function sendCaptureSave(source: string) {
	ipc.send('CAPTURER_SAVE', source)
}
