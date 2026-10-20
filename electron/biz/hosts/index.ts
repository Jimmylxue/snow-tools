import {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	type IpcMainInvokeEvent,
} from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
	applyHosts,
	exportEntriesText,
	flushDns,
	getHostsState,
	lookupDomain,
	readSystemHosts,
	restoreBackup,
} from './core'
import { parseHosts } from './hostsFile'
import { isState, listBackups, saveState } from './store'
import type {
	THostsApplyPayload,
	THostsApplyResult,
	THostsEntry,
	THostsExportResult,
	THostsImportResult,
} from './type'

let initialized = false

function getParentWindow(event: IpcMainInvokeEvent) {
	return BrowserWindow.fromWebContents(event.sender) ?? undefined
}

function failurePayload(error: unknown, fallback: string) {
	return {
		ok: false as const,
		code: 'FAILED' as const,
		message: error instanceof Error ? error.message : fallback,
	}
}

function isEntry(value: unknown): value is THostsEntry {
	const entry = value as THostsEntry | null
	return (
		!!entry &&
		typeof entry.id === 'string' &&
		typeof entry.ip === 'string' &&
		Array.isArray(entry.domains) &&
		entry.domains.every(domain => typeof domain === 'string') &&
		typeof entry.comment === 'string' &&
		typeof entry.enabled === 'boolean'
	)
}

function isValidApplyPayload(
	payload: THostsApplyPayload,
): payload is THostsApplyPayload {
	return (
		!!payload &&
		typeof payload === 'object' &&
		typeof payload.profileId === 'string' &&
		typeof payload.profileName === 'string' &&
		typeof payload.expectedSystemHash === 'string' &&
		Array.isArray(payload.entries) &&
		payload.entries.every(isEntry)
	)
}

export function initHosts() {
	if (initialized) return
	initialized = true

	ipcMain.handle('HOSTS_GET_STATE', () => getHostsState())

	ipcMain.handle('HOSTS_GET_SYSTEM', () => readSystemHosts())

	ipcMain.handle('HOSTS_SAVE_STATE', async (_, raw: unknown) => {
		if (!isState(raw)) {
			return { ok: false, message: 'Hosts 状态数据格式不正确' }
		}

		try {
			await saveState(raw)
			return { ok: true }
		} catch (error) {
			return failurePayload(error, '保存 Hosts 配置失败')
		}
	})

	ipcMain.handle(
		'HOSTS_APPLY',
		async (_, payload: THostsApplyPayload): Promise<THostsApplyResult> => {
			if (!isValidApplyPayload(payload)) {
				return {
					ok: false,
					code: 'FAILED',
					message: '应用参数不完整',
				}
			}

			try {
				return await applyHosts(payload)
			} catch (error) {
				return failurePayload(error, '应用系统 hosts 失败')
			}
		},
	)

	ipcMain.handle('HOSTS_FLUSH_DNS', async () => {
		try {
			return await flushDns()
		} catch (error) {
			return failurePayload(error, '刷新 DNS 缓存失败')
		}
	})

	ipcMain.handle('HOSTS_LIST_BACKUPS', () => listBackups())

	ipcMain.handle(
		'HOSTS_RESTORE_BACKUP',
		async (_, payload: { name?: string; flush?: boolean }) => {
			if (!payload || typeof payload.name !== 'string' || !payload.name) {
				return { ok: false, code: 'NOT_FOUND', message: '备份名称不正确' }
			}

			try {
				return await restoreBackup(payload.name, payload.flush !== false)
			} catch (error) {
				return failurePayload(error, '还原系统 hosts 失败')
			}
		},
	)

	ipcMain.handle('HOSTS_LOOKUP', async (_, payload: { domain?: string }) => {
		if (!payload || typeof payload.domain !== 'string') {
			return { ok: false, message: '请输入域名' }
		}
		return lookupDomain(payload.domain)
	})

	ipcMain.handle(
		'HOSTS_IMPORT',
		async (event): Promise<THostsImportResult> => {
			const parent = getParentWindow(event)
			const options = {
				title: '导入 hosts 文件',
				properties: ['openFile' as const],
				filters: [
					{ name: 'Hosts 文件', extensions: ['hosts', 'txt', 'conf'] },
					{ name: '所有文件', extensions: ['*'] },
				],
			}
			const { canceled, filePaths } = parent
				? await dialog.showOpenDialog(parent, options)
				: await dialog.showOpenDialog(options)

			if (canceled || !filePaths[0]) {
				return { canceled: true }
			}

			const content = await fs.readFile(filePaths[0], 'utf8')
			return {
				canceled: false,
				fileName: path.basename(filePaths[0]),
				entries: parseHosts(content),
			}
		},
	)

	ipcMain.handle(
		'HOSTS_EXPORT',
		async (
			event,
			payload: { profileName?: string; entries?: THostsEntry[] },
		): Promise<THostsExportResult> => {
			if (!payload || !Array.isArray(payload.entries)) {
				throw new Error('导出参数不完整')
			}

			const safeName = (payload.profileName || 'hosts').replace(
				/[\\/:*?"<>|]/g,
				'-',
			)
			const parent = getParentWindow(event)
			const options = {
				title: '导出 hosts 配置',
				defaultPath: path.join(
					app.getPath('desktop'),
					`hosts-${safeName}.txt`,
				),
				filters: [
					{ name: 'Hosts 文件', extensions: ['txt'] },
					{ name: '所有文件', extensions: ['*'] },
				],
			}
			const { canceled, filePath } = parent
				? await dialog.showSaveDialog(parent, options)
				: await dialog.showSaveDialog(options)

			if (canceled || !filePath) {
				return { canceled: true }
			}

			await fs.writeFile(filePath, exportEntriesText(payload.entries), 'utf8')
			return { canceled: false, filePath }
		},
	)
}
