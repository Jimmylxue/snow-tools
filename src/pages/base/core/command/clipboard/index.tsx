import { sendWindowSizeEvent } from '@/hooks/ipc/window'
import { ClipboardList, X } from 'lucide-react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { TBaseCommandProps } from '../type'
import { toast } from 'sonner'
import { TClipboardItem, useClipboardDB } from '@/hooks/clipboard/db'
import { CopyItem } from './components/CopyItem'
import { useClipboard } from '@/hooks/clipboard/useClipboard'
import { clipboardFilterArr } from './const'
import InfiniteScroll from 'react-infinite-scroll-component'
import { cloneDeep, debounce } from 'lodash-es'

function ClipboardContent({ destructCommand }: TBaseCommandProps) {
	const [selectedIndex, setSelectedIndex] = useState(0)
	const contentRef = useRef<HTMLDivElement>(null)

	const [typeIndex, setTypeIndex] = useState(0)

	const { updateClipBoard } = useClipboardDB()

	const { queryData, fetchNextPage, updateQueryParams } = useClipboard({
		queryParams: {},
	})

	/**
	 * 再存一份 用于做 收藏&取消收藏时 状态的立即同步更新
	 */
	const [clipboards, setClipboards] = useState<TClipboardItem[]>([])

	useEffect(() => {
		setClipboards(queryData?.items || [])
	}, [queryData])

	// 复制选中项内容
	const copySelectedItem = useCallback(() => {
		if (clipboards?.[selectedIndex]) {
			navigator.clipboard.writeText(clipboards?.[selectedIndex]?.content)
			toast('The copy has been copied', {
				duration: 700,
			})
		}
	}, [selectedIndex, clipboards])

	// 优化后的滚动函数
	const scrollToItem = useCallback((index: number) => {
		const contentItem = document.getElementById(`contentItem-${index}`)
		contentItem?.scrollIntoView({
			behavior: 'smooth',
			block: 'nearest',
		})
		if (index === 0) {
			setTimeout(() => {
				contentRef.current!.scrollTop = 0
			}, 100)
		}
	}, [])

	// 键盘事件处理
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			switch (event.key) {
				case 'ArrowUp':
					event.preventDefault()
					setSelectedIndex(prev => {
						const newIndex = Math.max(0, prev - 1)
						scrollToItem(newIndex)
						return newIndex
					})
					break
				case 'ArrowDown':
					event.preventDefault()
					setSelectedIndex(prev => {
						const newIndex = Math.min(queryData!.items!.length - 1, prev + 1)
						scrollToItem(newIndex)
						return newIndex
					})
					break
				case 'Enter':
					event.preventDefault()
					copySelectedItem()
					break
			}
		},
		[copySelectedItem, scrollToItem, queryData]
	)

	useEffect(() => {
		sendWindowSizeEvent('CLIPBOARD_HISTORY_PAGE')
		return () => sendWindowSizeEvent('INPUTTING')
	}, [])

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [handleKeyDown])

	const filterTextFn = useCallback(
		debounce(val => {
			if (val)
				updateQueryParams({
					content: val,
				})
		}, 500),
		[]
	)

	return (
		<div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<div className="flex items-center">
					<h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
						剪切板历史
					</h1>
					<button
						onClick={destructCommand}
						className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 ml-2"
						aria-label="关闭剪切板历史"
						title="关闭"
					>
						<X className="h-3 w-3" />
					</button>
				</div>

				<div className="flex items-center space-x-4">
					<div className="relative w-64">
						<input
							type="text"
							placeholder="搜索剪贴板内容..."
							onChange={e => {
								filterTextFn(e.target.value)
							}}
							className="pr-8 w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200"
						/>
						<svg
							className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>
				</div>
			</div>

			{/* Filter tabs */}
			<div className="flex items-center px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
				{clipboardFilterArr.map((item, index) => (
					<button
						key={index}
						className={`mr-3 px-3 py-1 rounded-md text-sm font-medium ${
							index === typeIndex
								? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
								: 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
						}`}
						onClick={() => {
							setTypeIndex(index)
							updateQueryParams(item.queryValue)
						}}
					>
						{item.text}
					</button>
				))}
			</div>

			{/* Content list */}
			<div
				ref={contentRef}
				id="clipboardList"
				className="flex-1 overflow-y-auto p-4 space-y-3"
			>
				<InfiniteScroll
					dataLength={clipboards?.length || 0}
					next={() => {
						fetchNextPage()
					}}
					hasMore={(queryData?.total || 0) > (clipboards?.length || 0)}
					loader={
						<div className="w-full text-center text-gray-400 mb-3">
							加载更多中
						</div>
					}
					endMessage={
						<div className=" w-full text-center text-gray-400 mb-5">
							没有更多了
						</div>
					}
					scrollableTarget="clipboardList"
				>
					{clipboards?.map((item, index) => (
						<CopyItem
							key={index}
							content={item}
							index={index}
							isSelected={selectedIndex === index}
							onClick={() => {
								setSelectedIndex(index)
								scrollToItem(index)
							}}
							onDoubleClick={copySelectedItem}
							onSave={async status => {
								await updateClipBoard({
									id: item.id,
									isCollect: status,
								})
								const _clipboardArr = cloneDeep(clipboards)
								_clipboardArr[index].isCollect = status
								setClipboards(_clipboardArr)
								toast('操作成功', {
									duration: 700,
								})
							}}
						/>
					))}
				</InfiniteScroll>
			</div>
		</div>
	)
}

export const CLIPBOARD_COMMAND = {
	icon: <ClipboardList className="mr-2 shrink-0 opacity-50" />,
	key: 'clipboard',
	placeholder: 'please',
	content: ClipboardContent,
}
