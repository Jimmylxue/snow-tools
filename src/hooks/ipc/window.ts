import { T_SCREEN_SIZE_TYPE } from 'electron/ipc/screen'
import { getIpc } from '.'
import { TRouterPage } from 'electron/router/core'
import { TCaptureSaveParams } from 'electron/router/capturer/type'

const ipc = getIpc()

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

export function sendHideWindowEvent() {
	ipc.send('screen_close_event')
}

export function sendRouterClose(router: TRouterPage) {
	ipc.send('ROUTER_CLOSE', router)
}

export function sendRouterNavigate(router: TRouterPage) {
	ipc.send('ROUTER_NAVIGATE', router)
}

export function sendCaptureSave(source: TCaptureSaveParams) {
	ipc.send('CAPTURER_SAVE', source)
}

export function sendCaptureHover(source: TCaptureSaveParams) {
	ipc.send('CAPTURER_HOVER', source)
}

export function sendNavigateBack() {
	ipc.send('ROUTER_ESC_BACK')
}

export function sendOpenApp(appName: string) {
	ipc.send('OPEN_APP', appName)
}
