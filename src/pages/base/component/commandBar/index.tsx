import { useState, useEffect, useRef, useMemo } from 'react'
import { TApp } from 'electron/biz/apps/type'
import { allTools } from '../../const'
import { SearchResult } from '../SearchResult'
import { STool } from '../STool'
import { getIpc } from '@/hooks/ipc'
import { sendRouterNavigate } from '@/hooks/ipc/window'
import LogoPng from '@/assets/img/logo.png'

const ipc = getIpc()

/** 应用数量可能很多，限制一次展示条数 */
const MAX_APP_RESULTS = 60

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

	useEffect(() => {
		const isShowSearchResult = input?.trim() !== ''
		const handleKeyDown = (e: KeyboardEvent) => {
			const cols = 6 // Number of columns in grid
			const displayedTools = allTools
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
							placeholder="Search tools & apps..."
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
						{/* All tools section (2 rows max) */}
						<div className="px-4 pt-3 pb-1 text-xs font-medium text-gray-500">
							All Tools
						</div>
						<div className="px-3 mt-1">
							<div className="grid grid-cols-6 gap-2">
								{allTools.slice(0, 12).map((tool, index) => {
									const isSelected = index === selectedIndex
									return (
										<STool key={index} isSelected={isSelected} stool={tool} />
									)
								})}
							</div>
						</div>
					</>
				) : (
					<SearchResult searchResult={searchResult} />
				)}
			</div>

			{/* Status bar */}
			<div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
				<div>
					{input.trim() === ''
						? ` ${allTools.slice(0, 12).length} tools`
						: `${searchResult.length} results`}
				</div>
				<div>↑↓←→ to navigate • Enter to open</div>
			</div>
		</div>
	)
}
