import type {
	THostsApplyPayload,
	THostsApplyResult,
	THostsBackupItem,
	THostsEntry,
	THostsExportResult,
	THostsFlushResult,
	THostsImportResult,
	THostsLookupResult,
	THostsRestoreResult,
	THostsState,
	THostsStateResponse,
	THostsSystemInfo,
} from 'electron/biz/hosts/type'
import { getIpc } from '.'

const ipc = getIpc()

export function getHostsState() {
	return ipc.invoke('HOSTS_GET_STATE') as Promise<THostsStateResponse>
}

export function getSystemHosts() {
	return ipc.invoke('HOSTS_GET_SYSTEM') as Promise<THostsSystemInfo>
}

export function saveHostsState(state: THostsState) {
	return ipc.invoke('HOSTS_SAVE_STATE', state) as Promise<{
		ok: boolean
		message?: string
	}>
}

export function applyHostsToSystem(payload: THostsApplyPayload) {
	return ipc.invoke('HOSTS_APPLY', payload) as Promise<THostsApplyResult>
}

export function flushHostsDns() {
	return ipc.invoke('HOSTS_FLUSH_DNS') as Promise<THostsFlushResult>
}

export function listHostsBackups() {
	return ipc.invoke('HOSTS_LIST_BACKUPS') as Promise<THostsBackupItem[]>
}

export function restoreHostsBackup(name: string, flush: boolean) {
	return ipc.invoke('HOSTS_RESTORE_BACKUP', { name, flush }) as Promise<
		THostsRestoreResult
	>
}

export function lookupHostsDomain(domain: string) {
	return ipc.invoke('HOSTS_LOOKUP', { domain }) as Promise<THostsLookupResult>
}

export function importHostsFile() {
	return ipc.invoke('HOSTS_IMPORT') as Promise<THostsImportResult>
}

export function exportHostsFile(profileName: string, entries: THostsEntry[]) {
	return ipc.invoke('HOSTS_EXPORT', {
		profileName,
		entries,
	}) as Promise<THostsExportResult>
}
