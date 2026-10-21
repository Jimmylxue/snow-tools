import { useState, useEffect, useRef, useMemo } from 'react'
import { TApp } from 'electron/biz/apps/type'
import { allTools } from '../../const'
import { SearchResult } from '../SearchResult'
import { STool } from '../STool'
import { CalcResult } from '../CalcResult'
import { getIpc } from '@/hooks/ipc'
import { sendNavigateBack, sendRouterNavigate } from '@/hooks/ipc/window'
import { copyToClipboard } from '@/lib/utils'
import { resolveInputTool } from '../../utils/inputTool'
import LogoPng from '@/assets/img/logo.png'

const ipc = getIpc()

/** 应用数量可能很多，限制一次展示条数 */
const MAX_APP_RESULTS = 60

/** 首页网格的列数与最多展示的工具数，渲染和键盘导航必须一致 */
const GRID_COLUMNS = 6
const MAX_VISIBLE_TOOLS = 18
const visibleTools = allTools.slice(0, MAX_VISIBLE_TOOLS)

export const SnowTools = () => {
	const [input, setInput] = useState('')
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [apps, setApps] = useState<TApp[]>([])
	const gridRef = useRef(null)
	const inputRef = useRef<HTMLInputElement>(null)
	const appsRequestedRef = useRef(false)

	/** 快捷键唤起面板时，把焦点放进搜索框 */
	useEffect(() => {
		const focusSearchInput = () => {
			inputRef.current?.focus()
			inputRef.current?.select()
		}

		ipc.on('window-shown', focusSearchInput)
		return () => {
			ipc.off('window-shown', focusSearchInput)
		}
	}, [])

	/** 第一次输入时才拉取应用列表，避免每次启动都白跑一遍 */
	useEffect(() => {
		if (!input.trim() || appsRequestedRef.current) return

		appsRequestedRef.current = true
		ipc.getInstalledApps().then(setApps).catch(error => {
			console.error('获取本地应用失败:', error)
		})
	}, [input])

	const searchResult = useMemo(() => {
		const keyword = input.trim().toUpperCase()
		if (!keyword) {
			return []
		}

		const matchedTools = allTools.filter(tool =>
			tool.name.toUpperCase().includes(keyword),
		)
		const matchedApps = apps
			.filter(
				app =>
					app.appName.toUpperCase().includes(keyword) ||
					app.originAppName.toUpperCase().includes(keyword),
			)
			.slice(0, MAX_APP_RESULTS)

		return [...matchedTools, ...matchedApps]
	}, [input, apps])

	/**
	 * 输入即工具：时间戳 / 进制 / 颜色 / Base64 / 哈希 / 算式 统一走这里。
	 * 命中同名工具或应用时不抢结果，让搜索优先。
	 */
	const calcResult = useMemo(() => {
		const expression = input.trim()
		if (!expression) return null

		const keyword = expression.toUpperCase()
		if (allTools.some(tool => tool.name.toUpperCase() === keyword)) {
			return null
		}
		if (
			apps.some(
				app =>
					app.appName.toUpperCase() === keyword ||
					app.originAppName.toUpperCase() === keyword,
			)
		) {
			return null
		}

		return resolveInputTool(expression)
	}, [input, apps])

	const handleCopyCalculation = () => {
		if (!calcResult) return
		copyToClipboard(calcResult.value)
		sendNavigateBack()
	}

	/** 复制附加行时也收起面板，和主结果的交互保持一致 */
	const handleCopyRow = (value: string) => {
		copyToClipboard(value)
		sendNavigateBack()
	}

	useEffect(() => {
		const isShowSearchResult = input?.trim() !== ''
		const handleKeyDown = (e: KeyboardEvent) => {
			const cols = GRID_COLUMNS
			const displayedTools = visibleTools
			const totalItems = displayedTools.length

			if (
				['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(
					e.key
				)
			) {
				e.preventDefault()
			}

			if (e.key === 'ArrowRight') {
				setSelectedIndex(prev =>
					prev % cols === cols - 1 || prev === totalItems - 1 ? prev : prev + 1
				)
			} else if (e.key === 'ArrowLeft') {
				setSelectedIndex(prev => (prev % cols === 0 ? prev : prev - 1))
			} else if (e.key === 'ArrowDown') {
				const newIndex = selectedIndex + cols
				if (newIndex < totalItems) {
					setSelectedIndex(newIndex)
				}
			} else if (e.key === 'ArrowUp') {
				const newIndex = selectedIndex - cols
				if (newIndex >= 0) {
					setSelectedIndex(newIndex)
				}
			} else if (e.key === 'Enter' && displayedTools.length > 0) {
				const stool = displayedTools[selectedIndex]
				if (stool.routerName === 'capturer') {
					ipc.send('COMMAND_TRIGGER_CAPTURER')
				} else {
					sendRouterNavigate(stool.routerName)
				}
				console.log(`Executing: ${displayedTools[selectedIndex].name}`)
			}
		}
		if (!isShowSearchResult) {
			window.addEventListener('keydown', handleKeyDown)
			return () => window.removeEventListener('keydown', handleKeyDown)
		}
	}, [selectedIndex, input])

	return (
		<div className="h-screen flex flex-col bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200 w-[700px]">
			{/* Search bar - 改进后的设计 */}
			<div className="p-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-gray-50">
				<div className="flex items-center space-x-3">
					{/* Logo with subtle background and shadow */}
					<div className="flex-shrink-0 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
						<img src={LogoPng} className="size-8" alt="SnowTools Logo" />
					</div>

					{/* Input with integrated styling */}
					<div className="relative flex-1">
						<input
							ref={inputRef}
							type="text"
							value={input}
							onChange={e => setInput(e.target.value)}
							onKeyDown={event => {
								if (!calcResult || event.key !== 'Enter') return
								if (
									event.nativeEvent.isComposing ||
									event.nativeEvent.keyCode === 229
								) {
									return
								}
								event.preventDefault()
								event.stopPropagation()
								handleCopyCalculation()
							}}
							placeholder="Search tools & apps... or 12*8"
							autoFocus
							className="w-full bg-white rounded-lg py-2.5 px-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all shadow-sm border border-gray-200 hover:border-blue-300"
						/>
						{/* Decorative elements */}
						<div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
							<kbd className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded border border-gray-200">
								⌘K
							</kbd>
						</div>
					</div>
				</div>
			</div>

			{/* Main content */}
			<div ref={gridRef} className="flex-1 overflow-y-auto">
				{input.trim() === '' ? (
					<>
						{/* All tools section（工具变多后允许换行，超出部分在容器内滚动） */}
						<div className="px-4 pt-3 pb-1 text-xs font-medium text-gray-500">
							All Tools
						</div>
						<div className="px-3 mt-1">
							<div className="grid grid-cols-6 gap-2">
								{visibleTools.map((tool, index) => {
									const isSelected = index === selectedIndex
									return (
										<STool key={index} isSelected={isSelected} stool={tool} />
									)
								})}
							</div>
						</div>
					</>
				) : (
					<>
						{calcResult && (
							<CalcResult
								result={calcResult}
								onCopy={handleCopyCalculation}
								onCopyRow={handleCopyRow}
							/>
						)}
						{searchResult.length > 0 ? (
							<SearchResult searchResult={searchResult} />
						) : calcResult ? null : (
							<div className="flex h-full items-center justify-center text-gray-400">
								No results found
							</div>
						)}
					</>
				)}
			</div>

			{/* Status bar */}
			<div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
				<div>
					{input.trim() === ''
						? ` ${visibleTools.length} tools`
						: calcResult
							? calcResult.kind
							: `${searchResult.length} results`}
				</div>
				<div>
					{calcResult
						? calcResult.rows.length > 0
							? 'Enter 复制主结果 · 点击其他行复制该项'
							: 'Enter 复制结果 · 应用点击打开'
						: '↑↓←→ to navigate • Enter to open'}
				</div>
			</div>
		</div>
	)
}
