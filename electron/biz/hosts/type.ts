export type THostsEntry = {
	id: string
	ip: string
	domains: string[]
	comment: string
	enabled: boolean
}

export type THostsProfile = {
	id: string
	name: string
	entries: THostsEntry[]
	updatedAt: number
}

export type THostsSettings = {
	autoFlush: boolean
}

export type THostsState = {
	version: 1
	activeProfileId: string
	profiles: THostsProfile[]
	settings: THostsSettings
}

export type THostsMeta = {
	/** 上一次成功应用时，启用条目的稳定签名，用来判断是否有未应用修改 */
	lastAppliedSignature: string | null
	lastAppliedAt: number | null
	lastFlushAt: number | null
}

export type THostsSystemInfo = {
	path: string
	exists: boolean
	content: string
	hash: string
	mtimeMs: number | null
	/** 从文件解析出的启用条目签名，用来检测外部修改 */
	signature: string
}

export type THostsStateResponse = {
	state: THostsState
	meta: THostsMeta
	system: THostsSystemInfo
	pending: boolean
	drift: boolean
}

export type THostsValidationError = {
	entryId: string
	field: 'ip' | 'domains' | 'duplicate'
	message: string
}

export type THostsApplyPayload = {
	profileId: string
	profileName: string
	entries: THostsEntry[]
	expectedSystemHash: string
	force?: boolean
	flush?: boolean
}

export type THostsApplyResult =
	| {
			ok: true
			system: THostsSystemInfo
			appliedSignature: string
			appliedAt: number
			flushed: boolean
			backupName: string | null
		}
	| {
			ok: false
			code: 'EXTERNAL_CHANGE' | 'VALIDATION' | 'CANCELLED' | 'FAILED'
			message: string
			errors?: THostsValidationError[]
			system?: THostsSystemInfo
		}

export type THostsBackupItem = {
	name: string
	size: number
	mtimeMs: number
	isOriginal: boolean
}

export type THostsRestoreResult =
	| {
			ok: true
			system: THostsSystemInfo
			restoredSignature: string
			flushed: boolean
			backupName: string | null
		}
	| { ok: false; code: 'CANCELLED' | 'FAILED' | 'NOT_FOUND'; message: string }

export type THostsFlushResult =
	| { ok: true; flushedAt: number }
	| { ok: false; code: 'CANCELLED' | 'FAILED'; message: string }

export type THostsImportResult =
	| { canceled: true }
	| { canceled: false; fileName: string; entries: THostsEntry[] }

export type THostsExportResult =
	| { canceled: true }
	| { canceled: false; filePath: string }

export type THostsLookupResult =
	| { ok: true; addresses: Array<{ address: string; family: number }> }
	| { ok: false; message: string }
