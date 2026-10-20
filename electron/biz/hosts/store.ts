import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { entriesSignature, parseHosts } from './hostsFile'
import type {
	THostsBackupItem,
	THostsEntry,
	THostsMeta,
	THostsProfile,
	THostsState,
} from './type'

const STATE_VERSION = 1
const BACKUP_KEEP = 20
const ORIGINAL_BACKUP = 'original.hosts'

let writeQueue: Promise<unknown> = Promise.resolve()

/** 状态文件和元信息可能并发保存，串行写入避免互相覆盖 */
function queueWrite<T>(task: () => Promise<T>) {
	const next = writeQueue.then(task, task)
	writeQueue = next.catch(() => undefined)
	return next
}

function hostsRoot() {
	return path.join(app.getPath('userData'), 'hosts')
}

export function getBackupDir() {
	return path.join(hostsRoot(), 'backups')
}

function statePath() {
	return path.join(hostsRoot(), 'state.json')
}

function metaPath() {
	return path.join(hostsRoot(), 'meta.json')
}

async function ensureRoot() {
	await fs.mkdir(getBackupDir(), { recursive: true })
}

async function readJson<T>(file: string): Promise<T | null> {
	try {
		return JSON.parse(await fs.readFile(file, 'utf8')) as T
	} catch {
		return null
	}
}

async function atomicWriteJson(file: string, value: unknown) {
	await ensureRoot()
	const tmp = `${file}.${process.pid}.tmp`
	await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
	await fs.rename(tmp, file)
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

function isProfile(value: unknown): value is THostsProfile {
	const profile = value as THostsProfile | null
	return (
		!!profile &&
		typeof profile.id === 'string' &&
		typeof profile.name === 'string' &&
		typeof profile.updatedAt === 'number' &&
		Array.isArray(profile.entries) &&
		profile.entries.every(isEntry)
	)
}

export function isState(value: unknown): value is THostsState {
	const state = value as THostsState | null
	return (
		!!state &&
		state.version === STATE_VERSION &&
		typeof state.activeProfileId === 'string' &&
		Array.isArray(state.profiles) &&
		state.profiles.length > 0 &&
		state.profiles.every(isProfile) &&
		typeof state.settings?.autoFlush === 'boolean'
	)
}

function isMeta(value: unknown): value is THostsMeta {
	const meta = value as THostsMeta | null
	return (
		!!meta &&
		(meta.lastAppliedSignature === null ||
			typeof meta.lastAppliedSignature === 'string') &&
		(meta.lastAppliedAt === null || typeof meta.lastAppliedAt === 'number') &&
		(meta.lastFlushAt === null || typeof meta.lastFlushAt === 'number')
	)
}

function createDefaultState(systemContent: string): THostsState {
	const entries = parseHosts(systemContent)
	const profile: THostsProfile = {
		id: randomUUID(),
		name: '系统默认',
		entries,
		updatedAt: Date.now(),
	}

	return {
		version: STATE_VERSION,
		activeProfileId: profile.id,
		profiles: [profile],
		settings: { autoFlush: true },
	}
}

export function getActiveProfile(state: THostsState): THostsProfile {
	return (
		state.profiles.find(profile => profile.id === state.activeProfileId) ??
		state.profiles[0]
	)
}

export async function loadState(systemContent: string) {
	await ensureRoot()

	const rawState = await readJson<THostsState>(statePath())
	let state = isState(rawState) ? rawState : createDefaultState(systemContent)

	if (!state.profiles.some(profile => profile.id === state.activeProfileId)) {
		state = { ...state, activeProfileId: state.profiles[0].id }
	}

	const rawMeta = await readJson<THostsMeta>(metaPath())
	const meta = isMeta(rawMeta)
		? rawMeta
		: {
				/** 首次运行：以系统现状为「已应用」，避免一打开就提示未应用 */
				lastAppliedSignature: entriesSignature(parseHosts(systemContent)),
				lastAppliedAt: null,
				lastFlushAt: null,
			}

	if (!isState(rawState) || rawState.activeProfileId !== state.activeProfileId) {
		await saveState(state)
	}
	if (!isMeta(rawMeta)) {
		await saveMeta(meta)
	}

	return { state, meta }
}

export function saveState(state: THostsState) {
	return queueWrite(() => atomicWriteJson(statePath(), state))
}

export function saveMeta(meta: THostsMeta) {
	return queueWrite(() => atomicWriteJson(metaPath(), meta))
}

/**
 * 应用成功后把主进程收到的条目落盘，避免渲染层防抖保存的旧状态回写
 */
export async function updateProfileSnapshot(
	profileId: string,
	profileName: string,
	entries: THostsEntry[],
) {
	const state = await readJson<THostsState>(statePath())
	if (!isState(state)) return

	const profile = state.profiles.find(item => item.id === profileId)
	if (!profile) return

	profile.name = profileName
	profile.entries = entries
	profile.updatedAt = Date.now()
	await saveState(state)
}

export async function ensureOriginalBackup(content: string) {
	await ensureRoot()
	const file = path.join(getBackupDir(), ORIGINAL_BACKUP)

	try {
		await fs.access(file)
	} catch {
		await fs.writeFile(file, content, 'utf8')
	}
}

function backupTimestamp() {
	const date = new Date()
	const pad = (value: number, length = 2) => String(value).padStart(length, '0')
	return [
		date.getFullYear(),
		pad(date.getMonth() + 1),
		pad(date.getDate()),
		'-',
		pad(date.getHours()),
		pad(date.getMinutes()),
		pad(date.getSeconds()),
		'-',
		pad(date.getMilliseconds(), 3),
	].join('')
}

async function pruneBackups() {
	const files = (await fs.readdir(getBackupDir(), { withFileTypes: true }))
		.filter(
			file =>
				file.isFile() &&
				file.name !== ORIGINAL_BACKUP &&
				file.name.endsWith('.hosts'),
		)
		.map(file => file.name)

	if (files.length <= BACKUP_KEEP) return

	const stats = await Promise.all(
		files.map(async name => ({
			name,
			mtimeMs: (await fs.stat(path.join(getBackupDir(), name))).mtimeMs,
		})),
	)
	stats.sort((a, b) => b.mtimeMs - a.mtimeMs)

	await Promise.all(
		stats
			.slice(BACKUP_KEEP)
			.map(item =>
				fs.unlink(path.join(getBackupDir(), item.name)).catch(() => undefined),
			),
	)
}

export async function createBackup(content: string) {
	await ensureRoot()
	const name = `hosts-${backupTimestamp()}.hosts`
	await fs.writeFile(path.join(getBackupDir(), name), content, 'utf8')
	await pruneBackups()
	return name
}

export async function listBackups(): Promise<THostsBackupItem[]> {
	await ensureRoot()
	const entries = await fs.readdir(getBackupDir(), { withFileTypes: true })
	const items = await Promise.all(
		entries
			.filter(file => file.isFile() && file.name.endsWith('.hosts'))
			.map(async file => {
				const stat = await fs.stat(path.join(getBackupDir(), file.name))
				return {
					name: file.name,
					size: stat.size,
					mtimeMs: stat.mtimeMs,
					isOriginal: file.name === ORIGINAL_BACKUP,
				}
			}),
	)

	return items.sort((a, b) => {
		if (a.isOriginal !== b.isOriginal) return a.isOriginal ? -1 : 1
		return b.mtimeMs - a.mtimeMs
	})
}

export async function readBackup(name: string) {
	const fileName = name === 'original' ? ORIGINAL_BACKUP : name
	if (!/^(original|hosts-[A-Za-z0-9.-]+)\.hosts$/.test(fileName)) {
		return null
	}

	try {
		return await fs.readFile(path.join(getBackupDir(), fileName), 'utf8')
	} catch {
		return null
	}
}
