export type TBaiduTranslateParams = {
	q: string
	from: string
	to: string
}

export type TBaiduTranslateResult = {
	from: string
	to: string
	trans_result: Array<{ src: string; dst: string }>
}

export type TBaiduTranslateConfigState = {
	configured: boolean
	appId: string
}

export type TBaiduTranslateSavePayload = {
	appId: string
	secret?: string
}

export type TBaiduTranslateIpcResult =
	| { ok: true; data: TBaiduTranslateResult }
	| { ok: false; message: string }

export type TBaiduTranslateSaveResult = {
	ok: boolean
	message?: string
}
