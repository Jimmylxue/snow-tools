import { useCallback, useEffect, useRef, useState } from 'react'
import { TClipboardItem, useClipboardDB } from './db'
import { TCopyItem } from 'electron/biz/clipboard/type'
import { uniqBy } from 'lodash-es'

type TParams = {
	queryParams: Partial<TCopyItem>
}

export function useClipboard({ queryParams }: TParams) {
	const [queryData, setQueryData] = useState<{
		total: number
		items: TClipboardItem[]
	}>()

	const page = useRef<number>(1)
	const pageSize = 6
	const _queryParams = useRef<TParams['queryParams']>(queryParams)

	const { queryClipBoard } = useClipboardDB()

	/**
	 * queryClipBoard 由 useClipboardDB 每次渲染重新创建，
	 * 直接进依赖会让 initQuery 失去稳定性，这里用 ref 固定住真正的实现。
	 */
	const queryClipBoardRef = useRef(queryClipBoard)
	queryClipBoardRef.current = queryClipBoard

	const initQuery = useCallback(async () => {
		const res = await queryClipBoardRef.current({
			..._queryParams.current,
			page: page.current,
			pageSize,
		})
		setQueryData(res)
	}, [pageSize])

	/**
	 * 重新拉取当前筛选条件下的数据，并回到第一页。
	 * 窗口重新显示、或监听到新内容时都要走这里，
	 * 否则面板会一直停在上次打开时的结果。
	 */
	const refresh = useCallback(async () => {
		page.current = 1
		const res = await queryClipBoardRef.current({
			..._queryParams.current,
			page: 1,
			pageSize,
		})
		setQueryData(res)
	}, [pageSize])

	useEffect(() => {
		void initQuery()
	}, [initQuery])

	const fetchNextPage = async () => {
		page.current = page.current + 1
		const res = await queryClipBoard({
			..._queryParams.current,
			page: page.current,
			pageSize,
		})
		setQueryData(preData => {
			return {
				total: res.total,
				items: uniqBy([...(preData?.items || []), ...res.items], 'id'),
			}
		})
	}

	/**
	 * 更新查询的筛选项
	 */
	const updateQueryParams = (params: TParams['queryParams']) => {
		setQueryData(undefined)
		_queryParams.current = params
		page.current = 1
		void initQuery()
	}

	return {
		queryData,
		fetchNextPage,
		updateQueryParams,
		refresh,
	}
}
