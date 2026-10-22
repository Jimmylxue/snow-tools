import type {
	TUpyunConfigState,
	TUpyunSavePayload,
	TUpyunSaveResult,
	TUpyunUploadPayload,
	TUpyunUploadResult,
} from 'electron/biz/upyun/type'
import { getIpc } from '.'

const ipc = getIpc()

export function getUpyunConfig() {
	return ipc.invoke('UPYUN_GET_CONFIG') as Promise<TUpyunConfigState>
}

export function saveUpyunConfig(payload: TUpyunSavePayload) {
	return ipc.invoke('UPYUN_SAVE_CONFIG', payload) as Promise<TUpyunSaveResult>
}

export function clearUpyunConfig() {
	return ipc.invoke('UPYUN_CLEAR_CONFIG') as Promise<TUpyunSaveResult>
}

export function uploadImageToUpyun(payload: TUpyunUploadPayload) {
	return ipc.invoke('UPYUN_UPLOAD', payload) as Promise<TUpyunUploadResult>
}
