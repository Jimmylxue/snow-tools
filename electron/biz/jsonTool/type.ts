type TJsonFileInfo = {
	canceled: false
	fileName: string
	content: string
	size: number
}

export type TJsonOpenFileResult = { canceled: true } | TJsonFileInfo

export type TJsonSaveFileResult =
	| { canceled: true }
	| { canceled: false; filePath: string }
