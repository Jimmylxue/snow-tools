import { T_HOT_KEY_TYPE } from '../../../electron/ipc/hotkey'
import { useIpc } from '.'

const ipc = useIpc()

export function sendHotKeyEvent(type: T_HOT_KEY_TYPE) {
	ipc.send('HOT_KEY_EVENT', type)
}
