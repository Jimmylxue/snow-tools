import type {
	TBaiduTranslateConfigState,
	TBaiduTranslateIpcResult,
	TBaiduTranslateParams,
	TBaiduTranslateResult,
	TBaiduTranslateSavePayload,
	TBaiduTranslateSaveResult,
} from 'electron/biz/translate/type'
import { getIpc } from '.'

const ipc = getIpc()

export async function translateText(
	params: TBaiduTranslateParams,
): Promise<TBaiduTranslateResult> {
	const result = (await ipc.invoke(
		'TRANSLATE_TEXT',
		params,
	)) as TBaiduTranslateIpcResult

	if (!result.ok) throw new Error(result.message)
	return result.data
}

export function getBaiduTranslateConfig() {
	return ipc.invoke(
		'TRANSLATE_GET_CONFIG',
	) as Promise<TBaiduTranslateConfigState>
}

export function saveBaiduTranslateConfig(
	payload: TBaiduTranslateSavePayload,
) {
	return ipc.invoke(
		'TRANSLATE_SAVE_CONFIG',
		payload,
	) as Promise<TBaiduTranslateSaveResult>
}

export function clearBaiduTranslateConfig() {
	return ipc.invoke(
		'TRANSLATE_CLEAR_CONFIG',
	) as Promise<TBaiduTranslateSaveResult>
}
