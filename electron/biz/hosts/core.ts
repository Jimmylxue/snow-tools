import { createHash } from 'node:crypto'
import dns from 'node:dns/promises'
import fs from 'node:fs/promises'
import {
	HostsElevationCancelledError,
	flushSystemDns,
	getSystemHostsPath,
	writeSystemHosts,
} from './elevate'
import {
	entriesSignature,
	parseHosts,
	renderHosts,
	renderHostsForExport,
	validateEntries,
} from './hostsFile'
import {
	createBackup,
	ensureOriginalBackup,
	getActiveProfile,
	loadState,
	readBackup,
	saveMeta,
	updateProfileSnapshot,
} from './store'
import type {
	THostsApplyPayload,
	THostsApplyResult,
	THostsEntry,
	THostsFlushResult,
	THostsLookupResult,
	THostsRestoreResult,
	THostsStateResponse,
	THostsSystemInfo,
} from './type'

function hashContent(content: string) {
	return createHash('sha256').update(content, 'utf8').digest('hex')
}

export async function readSystemHosts(): Promise<THostsSystemInfo> {
	const file = getSystemHostsPath()

	try {
		const [content, stat] = await Promise.all([
			fs.readFile(file, 'utf8'),
			fs.stat(file),
		])

		return {
			path: file,
			exists: true,
			content,
			hash: hashContent(content),
			mtimeMs: stat.mtimeMs,
			signature: entriesSignature(parseHosts(content)),
		}
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return {
				path: file,
				exists: false,
				content: '',
				hash: hashContent(''),
				mtimeMs: null,
				signature: '',
			}
		}

		throw error
	}
}

export async function getHostsState(): Promise<THostsStateResponse> {
	const system = await readSystemHosts()
	const { state, meta } = await loadState(system.content)
	await ensureOriginalBackup(system.content)

	const activeProfile = getActiveProfile(state)
	const pending =
		meta.lastAppliedSignature !== entriesSignature(activeProfile.entries)
	const drift =
		meta.lastAppliedSignature !== null &&
		system.signature !== meta.lastAppliedSignature

	return { state, meta, system, pending, drift }
}

export async function applyHosts(
	payload: THostsApplyPayload,
): Promise<THostsApplyResult> {
	const errors = validateEntries(payload.entries)
	if (errors.length) {
		return {
			ok: false,
			code: 'VALIDATION',
			message: '存在无效配置，请先修正后再应用',
			errors,
		}
	}

	const before = await readSystemHosts()

	if (
		!payload.force &&
		payload.expectedSystemHash &&
		before.hash !== payload.expectedSystemHash
	) {
		return {
			ok: false,
			code: 'EXTERNAL_CHANGE',
			message: '系统 hosts 已被其它程序修改',
			system: before,
		}
	}

	const content = renderHosts(payload.profileName, payload.entries)
	const unchanged = before.exists && before.content === content
	const shouldFlush = payload.flush !== false

	let backupName: string | null = null
	let flushed = false

	if (!unchanged) {
		await ensureOriginalBackup(before.content)
		backupName = await createBackup(before.exists ? before.content : '')

		try {
			await writeSystemHosts(content, shouldFlush)
			flushed = shouldFlush
		} catch (error) {
			if (error instanceof HostsElevationCancelledError) {
				return {
					ok: false,
					code: 'CANCELLED',
					message: '已取消管理员授权，系统 hosts 未修改',
				}
			}

			/** 提权进程可能已经写入但返回了非 0，回读确认后再决定是否失败 */
			const afterFailure = await readSystemHosts().catch(() => null)
			if (!afterFailure || afterFailure.content !== content) {
				return {
					ok: false,
					code: 'FAILED',
					message:
						error instanceof Error ? error.message : '写入系统 hosts 失败',
				}
			}

			flushed = shouldFlush
		}

		const after = await readSystemHosts()
		if (after.content !== content) {
			return {
				ok: false,
				code: 'FAILED',
				message: '写入后校验失败，系统 hosts 与预期内容不一致',
			}
		}
	}

	const appliedAt = Date.now()
	const appliedSignature = entriesSignature(payload.entries)
	const { meta } = await loadState(before.content)
	meta.lastAppliedSignature = appliedSignature
	meta.lastAppliedAt = appliedAt
	if (flushed) {
		meta.lastFlushAt = appliedAt
	}
	await saveMeta(meta)
	await updateProfileSnapshot(
		payload.profileId,
		payload.profileName,
		payload.entries,
	)

	return {
		ok: true,
		system: await readSystemHosts(),
		appliedSignature,
		appliedAt,
		flushed,
		backupName,
	}
}

export async function flushDns(): Promise<THostsFlushResult> {
	try {
		await flushSystemDns()
	} catch (error) {
		if (error instanceof HostsElevationCancelledError) {
			return { ok: false, code: 'CANCELLED', message: '已取消管理员授权' }
		}
		return {
			ok: false,
			code: 'FAILED',
			message: error instanceof Error ? error.message : '刷新 DNS 缓存失败',
		}
	}

	const flushedAt = Date.now()
	const system = await readSystemHosts()
	const { meta } = await loadState(system.content)
	meta.lastFlushAt = flushedAt
	await saveMeta(meta)

	return { ok: true, flushedAt }
}

export async function restoreBackup(
	name: string,
	flush: boolean,
): Promise<THostsRestoreResult> {
	const content = await readBackup(name)
	if (content === null) {
		return { ok: false, code: 'NOT_FOUND', message: '备份文件不存在或已失效' }
	}

	const before = await readSystemHosts()
	const unchanged = before.exists && before.content === content
	let backupName: string | null = null

	if (!unchanged) {
		await ensureOriginalBackup(before.content)
		backupName = await createBackup(before.exists ? before.content : '')

		try {
			await writeSystemHosts(content, flush)
		} catch (error) {
			if (error instanceof HostsElevationCancelledError) {
				return {
					ok: false,
					code: 'CANCELLED',
					message: '已取消管理员授权，系统 hosts 未修改',
				}
			}

			const afterFailure = await readSystemHosts().catch(() => null)
			if (!afterFailure || afterFailure.content !== content) {
				return {
					ok: false,
					code: 'FAILED',
					message:
						error instanceof Error ? error.message : '还原系统 hosts 失败',
				}
			}
		}

		const after = await readSystemHosts()
		if (after.content !== content) {
			return {
				ok: false,
				code: 'FAILED',
				message: '还原后校验失败，系统 hosts 与备份内容不一致',
			}
		}
	}

	const restoredSignature = entriesSignature(parseHosts(content))
	const restoredAt = Date.now()
	const { meta } = await loadState(before.content)
	meta.lastAppliedSignature = restoredSignature
	meta.lastAppliedAt = restoredAt
	if (flush) {
		meta.lastFlushAt = restoredAt
	}
	await saveMeta(meta)

	return {
		ok: true,
		system: await readSystemHosts(),
		restoredSignature,
		flushed: flush,
		backupName,
	}
}

export async function lookupDomain(domain: string): Promise<THostsLookupResult> {
	const clean = domain.trim().toLowerCase()
	if (!clean || /\s/.test(clean)) {
		return { ok: false, message: '域名格式不正确' }
	}

	try {
		const addresses = await dns.lookup(clean, { all: true, verbatim: true })
		return {
			ok: true,
			addresses: addresses.map(item => ({
				address: item.address,
				family: item.family,
			})),
		}
	} catch (error) {
		return {
			ok: false,
			message: error instanceof Error ? error.message : '解析失败',
		}
	}
}

export function exportEntriesText(entries: THostsEntry[]) {
	return renderHostsForExport(entries)
}
