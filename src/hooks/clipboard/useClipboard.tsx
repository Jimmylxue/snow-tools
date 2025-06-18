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

	const initQuery = useCallback(async () => {
		const res = await queryClipBoard({
			..._queryParams.current,
			page: page.current,
			pageSize,
		})
		setQueryData(res)
	}, [page, pageSize, queryClipBoard])

	useEffect(() => {
		initQuery()
	}, [])

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
		initQuery()
	}

	return {
		queryData,
		fetchNextPage,
		updateQueryParams,
	}
}
