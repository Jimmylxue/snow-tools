import { v4 as uuidv4 } from 'uuid'

export type TJsonHistoryItem = {
	id: string
	time: number
	input: string
	action: string
}

const STORAGE_KEY = 'snowtools.json.history'
const MAX_ITEMS = 20
const MAX_INPUT_LENGTH = 200 * 1024

function isHistoryItem(value: unknown): value is TJsonHistoryItem {
	const item = value as TJsonHistoryItem | null
	return (
		!!item &&
		typeof item.id === 'string' &&
		typeof item.time === 'number' &&
		typeof item.input === 'string' &&
		typeof item.action === 'string'
	)
}

export function loadJsonHistory(): TJsonHistoryItem[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return []
		const parsed: unknown = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed.filter(isHistoryItem).slice(0, MAX_ITEMS)
	} catch {
		return []
	}
}

export function saveJsonHistory(items: TJsonHistoryItem[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
	} catch {
		/** 超出 localStorage 配额时静默放弃，历史记录不影响主流程 */
	}
}

export function pushJsonHistory(
	input: string,
	action: string,
	current: TJsonHistoryItem[],
) {
	if (!input.trim() || input.length > MAX_INPUT_LENGTH) return current

	const next = [
		{ id: uuidv4(), time: Date.now(), input, action },
		...current.filter(item => item.input !== input),
	].slice(0, MAX_ITEMS)

	saveJsonHistory(next)
	return next
}
