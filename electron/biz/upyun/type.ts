export type TUpyunConfigState = {
	configured: boolean
	bucket: string
	operator: string
	domain: string
	directory: string
}

export type TUpyunSavePayload = {
	bucket: string
	operator: string
	secret?: string
	domain?: string
	directory?: string
}

export type TUpyunSaveResult = {
	ok: boolean
	message?: string
}

export type TUpyunUploadPayload = {
	fileName: string
	mimeType: string
	data: ArrayBuffer | Uint8Array
}

export type TUpyunUploadResult =
	| { ok: true; url: string; path: string }
	| { ok: false; message: string }
