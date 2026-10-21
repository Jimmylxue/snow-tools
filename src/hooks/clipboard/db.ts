import Dexie, { type EntityTable } from 'dexie'
import { TCopyItem } from 'electron/biz/clipboard/type'
import { useEffect, useState } from 'react'

type TPageQuery = {
	page: number
	pageSize: number
}

export type TClipboardItem = TCopyItem & { id: number }

export type TQueryParams = Partial<TCopyItem> & TPageQuery

export const clipboardDb = new Dexie('MyClipboard') as Dexie & {
	items: EntityTable<TClipboardItem, 'id'>
}

clipboardDb.version(1).stores({
	items: '++id, content, type, createdTime, isCollect', // 主键是自增的id
})

/**
 * 文本保留 3 天；图片另外受体积与张数上限约束（见主进程 images.ts）。
 * 两种策略都不会删收藏项。
 */
const TEXT_RETENTION_MS = 3 * 24 * 60 * 60 * 1000

export function useClipboardDB() {
	const [page, setPage] = useState<number>(1)

	// 用于跟踪已加载的最新数据的日期，防止重复
	const [latestLoadedDate, setLatestLoadedDate] = useState(Date.now())

	const loadMore = () => {
		setPage(page + 1)
	}

	// 检查是否有新数据
	const checkNewData = async () => {
		const newestItem = await clipboardDb.items
			.orderBy('createdTime')
			.reverse()
			.first()

		if (newestItem && newestItem.createdTime > latestLoadedDate) {
			// 有新数据，重置到第一页
			setPage(1)
			setLatestLoadedDate(newestItem.createdTime)
		}
	}

	/**
	 * 增加Clipboard
	 */
	const addClipBoard = async (params: Omit<TCopyItem, 'id'>) => {
		await clipboardDb.items.add(params)
	}

	/**
	 * 更新Clipboard
	 */
	const updateClipBoard = async (
		params: Partial<TCopyItem> & { id: number }
	) => {
		const { id, ...args } = params
		await clipboardDb.items.update(id, args)
	}

	/**
	 * 删除Clipboard
	 */
	const deleteClipBoard = async (id: number) => {
		await clipboardDb.items.delete(id)
	}

	const queryClipBoard = async (params: TQueryParams) => {
		const { page, pageSize, ...otherSearchParam } = params

		// 创建基础查询
		let query = clipboardDb.items.orderBy('createdTime').reverse()

		// 动态添加 where 条件
		if (otherSearchParam.content) {
			query = query.filter(item =>
				item.content.includes(otherSearchParam.content!)
			)
		}
		if (otherSearchParam.isCollect) {
			query = query.filter(
				item => item.isCollect === otherSearchParam.isCollect
			)
		}
		if (otherSearchParam.type) {
			query = query.filter(item => item.type === otherSearchParam.type)
		}

		const total = await query.clone().count()
		const items = await query
			.offset((page - 1) * pageSize)
			.limit(pageSize)
			.toArray()

		return { items, total }
	}

	/** 清理过期记录；收藏项始终保留 */
	const deleteExpiredRecords = async () => {
		const expireBefore = Date.now() - TEXT_RETENTION_MS

		await clipboardDb.items
			.where('createdTime')
			.below(expireBefore)
			.filter(item => !item.isCollect)
			.delete()
	}

	useEffect(() => {
		// 每天执行一次清理，首次加载时也跑一遍
		const interval = setInterval(deleteExpiredRecords, 24 * 60 * 60 * 1000)

		deleteExpiredRecords()

		return () => {
			clearInterval(interval)
		}
	}, [])

	return {
		loadMore,
		checkNewData,
		addClipBoard,
		updateClipBoard,
		deleteClipBoard,
		queryClipBoard,
		deleteExpiredRecords,
	}
}
