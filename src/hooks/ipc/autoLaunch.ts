import type {
	TAutoLaunchSetResult,
	TAutoLaunchState,
} from 'electron/biz/autoLaunch/type'
import { getIpc } from '.'

const ipc = getIpc()

export function getAutoLaunchState() {
	return ipc.invoke('AUTO_LAUNCH_GET') as Promise<TAutoLaunchState>
}

export function setAutoLaunch(enabled: boolean) {
	return ipc.invoke('AUTO_LAUNCH_SET', enabled) as Promise<TAutoLaunchSetResult>
}

export function openAutoLaunchSettings() {
	return ipc.invoke('AUTO_LAUNCH_OPEN_SETTINGS')
}
