import type {
	TJsonOpenFileResult,
	TJsonSaveFileResult,
} from 'electron/biz/jsonTool/type'
import { getIpc } from '.'

const ipc = getIpc()

export function openJsonFile() {
	return ipc.invoke('JSON_OPEN_FILE') as Promise<TJsonOpenFileResult>
}

export function saveJsonFile(payload: {
	defaultName: string
	content: string
}) {
	return ipc.invoke('JSON_SAVE_FILE', payload) as Promise<TJsonSaveFileResult>
}
