import type {
	TSpotlightShortcutResult,
	TSpotlightShortcutState,
} from 'electron/biz/spotlight/type'
import { getIpc } from '.'

const ipc = getIpc()

export function getSpotlightShortcutState() {
	return ipc.invoke('SPOTLIGHT_GET_STATE') as Promise<TSpotlightShortcutState>
}

export function setSpotlightShortcutDisabled(disabled: boolean) {
	return ipc.invoke('SPOTLIGHT_SET_DISABLED', disabled) as Promise<TSpotlightShortcutResult>
}
