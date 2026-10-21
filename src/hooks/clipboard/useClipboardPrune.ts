import { useCallback, useEffect, useRef } from 'react'
import { clipboardDb } from './db'
import { getIpc } from '@/hooks/ipc'

const ipc = getIpc()

/** 清理节流：一天最多跑一次，避免每次打开面板都全表扫描 */
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000
const LAST_PRUNE_KEY = 'snowtools.clipboard.lastPrune'

type TPruneResult = {
	removed: number
	removedBytes: number
}

function getLastPruneAt() {
	const raw = window.localStorage.getItem(LAST_PRUNE_KEY)
	const value = raw ? Number(raw) : 0
	return Number.isFinite(value) ? value : 0
}

/**
 * 剪贴板存储清理。
 *
 * 数据库层删掉过期记录后，磁盘上会留下一批没人引用的图片，
 * 这里把「仍被引用」和「已收藏」的文件名交给主进程，
 * 由主进程按体积/张数/天数三重上限统一回收。
 */
export function useClipboardPrune() {
	const running = useRef(false)

	const pruneNow = useCallback(async (): Promise<TPruneResult | null> => {
		if (running.current) return null
		running.current = true

		try {
			const now = Date.now()
			const all = await clipboardDb.items.toArray()

			/** 图片条目里被收藏的，主进程必须跳过，不能因为容量策略清掉 */
			const keepFileNames = all
				.filter(item => item.type === 'IMAGE' && item.isCollect && item.image)
				.map(item => item.image!.fileName)

			/**
			 * 过期判断和数据库层保持一致：
			 * 未被收藏且超过保留期的条目，连同它的图片一起作废。
			 */
			const referencedFileNames = all
				.filter(
					item =>
						item.type === 'IMAGE' &&
						item.image &&
						(item.isCollect || now - item.createdTime <= 3 * 24 * 60 * 60 * 1000),
				)
				.map(item => item.image!.fileName)

			const result = (await ipc.invoke('CLIPBOARD_PRUNE_IMAGES', {
				referencedFileNames,
				keepFileNames,
			})) as TPruneResult

			window.localStorage.setItem(LAST_PRUNE_KEY, String(now))

			return result
		} catch (error) {
			console.error('清理剪贴板图片失败:', error)
			return null
		} finally {
			running.current = false
		}
	}, [])

	useEffect(() => {
		if (Date.now() - getLastPruneAt() < PRUNE_INTERVAL_MS) return

		void pruneNow()
	}, [pruneNow])

	return { pruneNow }
}
