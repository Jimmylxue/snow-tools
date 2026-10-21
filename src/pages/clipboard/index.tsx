import { sendWindowSizeEvent } from '@/hooks/ipc/window'
import { X } from 'lucide-react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { TClipboardItem, clipboardDb, useClipboardDB } from '@/hooks/clipboard/db'
import { CopyItem } from './components/CopyItem'
import { useClipboard } from '@/hooks/clipboard/useClipboard'
import { clipboardFilterArr } from './const'
import InfiniteScroll from 'react-infinite-scroll-component'
import { cloneDeep, debounce } from 'lodash-es'
import { getIpc } from '@/hooks/ipc'
import { PermissionPrompt } from '@/components/common/Permission'
import { useClipboardPrune } from '@/hooks/clipboard/useClipboardPrune'
import { subscribeClipboardChange } from '@/hooks/clipboard/useClipBoardChange'
import {
	clearClipboardImages,
	copyClipboardImage,
	getClipboardImageStats,
} from '@/hooks/ipc/clipboard'
import type { TClipboardImageStats } from 'electron/biz/clipboard/type'

const ipc = getIpc()

const isMac = navigator.platform.includes('Mac')

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function Clipboard() {
	const [selectedIndex, setSelectedIndex] = useState(0)
	const contentRef = useRef<HTMLDivElement>(null)
	/**
	 * permission 请求锁
	 */
	const permissionRequested = useRef(false)

	/**
	 * mac 端 需要给于权限才可使用
	 */
	const [hasPermission, setHasPermission] = useState<boolean>(
		isMac ? false : true
	)

	const [typeIndex, setTypeIndex] = useState(0)

	const { updateClipBoard } = useClipboardDB()

	/** 打开面板时顺带做一次磁盘回收，一天最多一次 */
	useClipboardPrune()

	/** 图片占用统计，只在筛选栏展示，不参与列表渲染 */
	const [imageStats, setImageStats] = useState<TClipboardImageStats | null>(null)

	const refreshImageStats = useCallback(() => {
		getClipboardImageStats()
			.then(setImageStats)
			.catch(error => console.error('读取图片占用失败:', error))
	}, [])

	useEffect(() => {
		refreshImageStats()
	}, [refreshImageStats])

	/** 清空图片：只删未被收藏的，收藏项保留 */
	const handleClearImages = useCallback(async () => {
		/**
		 * 收藏项必须从数据库全量取，不能用当前列表：
		 * 列表是分页的，收藏的图很可能不在已加载的那几页里，
		 * 漏掉就会被误删。
		 */
		const collected = await clipboardDb.items
			.filter(item => item.isCollect && item.type === 'IMAGE')
			.toArray()

		const keepFileNames = collected
			.map(item => item.image?.fileName)
			.filter((name): name is string => !!name)

		const result = await clearClipboardImages(keepFileNames)
		refreshImageStats()
		toast(`已清理 ${result.removed} 张图片`, { duration: 1500 })
	}, [refreshImageStats])

	const { queryData, fetchNextPage, updateQueryParams, refresh } = useClipboard({
		queryParams: {},
	})

	/**
	 * 窗口常驻、只挂载一次，不能指望重新挂载来刷新数据。
	 * 监听主进程的「窗口显示」与「新内容」两种通知，主动重查。
	 */
	useEffect(() => {
		return subscribeClipboardChange(() => {
			void refresh()
			refreshImageStats()
		})
	}, [refresh, refreshImageStats])

	/**
	 * 再存一份 用于做 收藏&取消收藏时 状态的立即同步更新
	 */
	const [clipboards, setClipboards] = useState<TClipboardItem[]>([])

	useEffect(() => {
		setClipboards(queryData?.items || [])
	}, [queryData])

	// 复制选中项内容；图片条目走主进程把原图写回剪贴板
	const copySelectedItem = useCallback(async () => {
		const target = clipboards?.[selectedIndex]
		if (!target) return

		if (target.type === 'IMAGE' && target.image) {
			const result = await copyClipboardImage(target.image.fileName)
			toast(result.ok ? '图片已复制' : '图片已清理，无法复制', {
				duration: 700,
			})
			return
		}

		navigator.clipboard.writeText(target.content)
		toast('The copy has been copied', {
			duration: 700,
		})
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
					void copySelectedItem()
					break
			}
		},
		[copySelectedItem, scrollToItem, queryData]
	)

	useEffect(() => {
		sendWindowSizeEvent('CLIPBOARD')
		return () => sendWindowSizeEvent('INPUTTING')
	}, [])

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [handleKeyDown])

	/**
	 * 搜索防抖。
	 * debounce 实例必须稳定持有：写在 useCallback 里每次渲染都会新建一个，
	 * 防抖就失效了。内部通过 ref 拿最新的 updateQueryParams，避免闭包过期。
	 */
	const updateQueryParamsRef = useRef(updateQueryParams)
	updateQueryParamsRef.current = updateQueryParams

	const filterTextFn = useRef(
		debounce((val: string) => {
			if (val) updateQueryParamsRef.current({ content: val })
		}, 500),
	).current

	useEffect(() => {
		return () => filterTextFn.cancel()
	}, [filterTextFn])

	useEffect(() => {
		if (!isMac) {
			return
		}
		if (!permissionRequested.current) {
			permissionRequested.current = true
			ipc.send('REQUIRE_PERMISSION')
			const permissionHandler = (_: unknown, status: boolean) => {
				console.log('hasPermission')
				setHasPermission(status)
			}
			ipc.on('MAC_AUXILIARY_PERMISSION', permissionHandler)
			return () => {
				ipc.off('MAC_AUXILIARY_PERMISSION', permissionHandler)
			}
		}
	}, [])

	return !hasPermission ? (
		<PermissionPrompt
			onRequestPermission={() => {
				ipc.send('REQUIRE_PERMISSION')
			}}
			// onClose={destructCommand}
		/>
	) : (
		<div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
			<div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
				<div className="flex items-center">
					<h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
						剪切板历史
					</h1>
					<button
						// onClick={destructCommand}
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
			<div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
				<div className="flex items-center">
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

				{/* 图片占用一目了然，满了可以手动释放 */}
				{imageStats && imageStats.count > 0 && (
					<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
						<span title="图片存在磁盘上，不占内存">
							{imageStats.count} 张 · {formatBytes(imageStats.totalBytes)}
						</span>
						<button
							type="button"
							onClick={handleClearImages}
							title="删除全部图片，释放磁盘空间（收藏项会被保留）"
							className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500 transition-colors hover:border-red-300 hover:text-red-500 dark:border-gray-600 dark:text-gray-400"
						>
							清空图片
						</button>
					</div>
				)}
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
							onDoubleClick={() => void copySelectedItem()}
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
