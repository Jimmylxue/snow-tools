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
		// 添加其他可能的条件...

		const total = await query.clone().count()
		const items = await query
			.offset((page - 1) * pageSize)
			.limit(pageSize)
			.toArray()

		return { items, total }
	}

	useEffect(() => {
		/**
		 * 删除三天前的 所有数据 应该怎么写
		 */
		const deleteOldData = async () => {
			const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
			await clipboardDb.items.where('createdTime').below(threeDaysAgo).delete()
		}

		// 每天执行一次清理
		const interval = setInterval(deleteOldData, 24 * 60 * 60 * 1000)

		// 首次加载时执行一次
		deleteOldData()

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
	}
}
