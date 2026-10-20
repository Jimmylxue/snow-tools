import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import type { THostsEntry, THostsValidationError } from './type'

/**
 * label 允许下划线，兼容不少团队使用的 dev_host 这类内网域名
 */
const DOMAIN_RE =
	/^(?=.{1,253}$)[a-zA-Z0-9_](?:[a-zA-Z0-9_-]*[a-zA-Z0-9_])?(?:\.[a-zA-Z0-9_](?:[a-zA-Z0-9_-]*[a-zA-Z0-9_])?)*$/

export function normalizeDomains(domains: string[]) {
	const result: string[] = []
	const seen = new Set<string>()

	for (const raw of domains) {
		const domain = raw.trim().toLowerCase()
		if (!domain || seen.has(domain)) continue
		seen.add(domain)
		result.push(domain)
	}

	return result
}

function parseBody(raw: string, enabled: boolean): THostsEntry | null {
	const hashIndex = raw.indexOf('#')
	const body = (hashIndex >= 0 ? raw.slice(0, hashIndex) : raw).trim()
	const comment = hashIndex >= 0 ? raw.slice(hashIndex + 1).trim() : ''

	if (!body) return null

	const match = body.match(/^(\S+)\s+(.+)$/)
	if (!match) return null

	const ip = match[1]
	if (!isIP(ip)) return null

	const domains = normalizeDomains(match[2].split(/\s+/))
	if (!domains.length) return null

	return {
		id: randomUUID(),
		ip,
		domains,
		comment,
		enabled,
	}
}

/**
 * 兼容被注释掉的条目：`# 127.0.0.1 api.dev.local` 会解析为禁用状态，
 * 方便首次导入时保留原有的备用配置
 */
export function parseHosts(content: string): THostsEntry[] {
	const entries: THostsEntry[] = []

	for (const line of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
		const trimmed = line.trimStart()
		if (!trimmed) continue

		if (trimmed.startsWith('#')) {
			const entry = parseBody(trimmed.slice(1), false)
			if (entry) entries.push(entry)
			continue
		}

		const entry = parseBody(trimmed, true)
		if (entry) entries.push(entry)
	}

	return entries
}

function normalizeComment(comment: string) {
	return comment.replace(/\s+/g, ' ').trim()
}

function formatEntry(entry: THostsEntry) {
	const domains = normalizeDomains(entry.domains)
	const comment = normalizeComment(entry.comment)
	return `${entry.ip}\t${domains.join(' ')}${comment ? `\t# ${comment}` : ''}`
}

export function renderHosts(profileName: string, entries: THostsEntry[]) {
	const lines = [
		'# Managed by SnowTools',
		`# Profile: ${profileName.replace(/[\r\n]+/g, ' ')}`,
		'# Changes are overwritten the next time you apply from SnowTools.',
		`# Updated: ${new Date().toISOString()}`,
		'',
	]

	for (const entry of entries) {
		if (!entry.enabled || !normalizeDomains(entry.domains).length) continue
		lines.push(formatEntry(entry))
	}

	return `${lines.join('\n')}\n`
}

/** 导出时把禁用条目也带上，重新导入后仍能恢复启用状态 */
export function renderHostsForExport(entries: THostsEntry[]) {
	const lines = ['# Exported by SnowTools', '']

	for (const entry of entries) {
		if (!normalizeDomains(entry.domains).length) continue
		lines.push(entry.enabled ? formatEntry(entry) : `# ${formatEntry(entry)}`)
	}

	return `${lines.join('\n')}\n`
}

export function validateEntries(entries: THostsEntry[]): THostsValidationError[] {
	const errors: THostsValidationError[] = []
	/** 同一个域名允许同时存在 IPv4 / IPv6 映射，只有同协议族才算冲突 */
	const enabledDomains = new Map<
		string,
		Array<{ entryId: string; family: number }>
	>()

	for (const entry of entries) {
		if (!entry.enabled) continue

		const family = isIP(entry.ip)

		if (!family) {
			errors.push({
				entryId: entry.id,
				field: 'ip',
				message: `IP 格式不正确：${entry.ip || '空'}`,
			})
		}

		const domains = normalizeDomains(entry.domains)
		if (!domains.length) {
			errors.push({
				entryId: entry.id,
				field: 'domains',
				message: '至少填写一个域名',
			})
			continue
		}

		for (const domain of domains) {
			if (!DOMAIN_RE.test(domain)) {
				errors.push({
					entryId: entry.id,
					field: 'domains',
					message: `域名格式不正确：${domain}`,
				})
				continue
			}

			const previous = enabledDomains.get(domain) ?? []
			if (
				previous.some(
					item => item.family === family && item.entryId !== entry.id,
				)
			) {
				errors.push({
					entryId: entry.id,
					field: 'duplicate',
					message: `域名 ${domain} 已存在相同协议族（IPv4/IPv6）的映射`,
				})
				continue
			}

			previous.push({ entryId: entry.id, family })
			enabledDomains.set(domain, previous)
		}
	}

	return errors
}

/**
 * 只取「会写进系统文件」的字段，保证格式调整、条目排序不会被误判成未应用修改
 */
export function entriesSignature(entries: THostsEntry[]) {
	return entries
		.filter(entry => entry.enabled)
		.flatMap(entry =>
			normalizeDomains(entry.domains).map(
				domain =>
					`${entry.ip} ${domain} ${normalizeComment(entry.comment)}`,
			),
		)
		.sort()
		.join('\n')
}
