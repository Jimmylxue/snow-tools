import { TApp } from 'electron/biz/apps/type'
import { useEffect, useRef, useState } from 'react'
import { getIpc } from '@/hooks/ipc'
import { sendOpenApp, sendRouterNavigate } from '@/hooks/ipc/window'
import { TTools } from '../../type'
import { SApp } from '../SApp'
import { STool } from '../STool'

const ipc = getIpc()

const GRID_COLUMNS = 6

type TProps = {
	searchResult: (TApp | TTools)[]
}

function isApp(item: TApp | TTools): item is TApp {
	return 'appPath' in item
}

export function SearchResult({ searchResult }: TProps) {
	const [selectedIndex, setSelectedIndex] = useState(0)
	const itemRefs = useRef<Array<HTMLDivElement | null>>([])

	/** 换了检索词就回到第一条，避免选中下标越界或停在无关项上 */
	useEffect(() => {
		setSelectedIndex(0)
	}, [searchResult])

	useEffect(() => {
		itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' })
	}, [selectedIndex, searchResult])

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const totalItems = searchResult.length

			if (
				['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(
					e.key,
				)
			) {
				e.preventDefault()
			}

			if (e.key === 'ArrowRight') {
				setSelectedIndex(prev =>
					prev % GRID_COLUMNS === GRID_COLUMNS - 1 || prev === totalItems - 1
						? prev
						: prev + 1,
				)
			} else if (e.key === 'ArrowLeft') {
				setSelectedIndex(prev => (prev % GRID_COLUMNS === 0 ? prev : prev - 1))
			} else if (e.key === 'ArrowDown') {
				setSelectedIndex(prev =>
					prev + GRID_COLUMNS < totalItems ? prev + GRID_COLUMNS : prev,
				)
			} else if (e.key === 'ArrowUp') {
				setSelectedIndex(prev =>
					prev - GRID_COLUMNS >= 0 ? prev - GRID_COLUMNS : prev,
				)
			} else if (e.key === 'Enter' && totalItems > 0) {
				const selectedItem = searchResult[selectedIndex]

				if (!selectedItem) return

				if (isApp(selectedItem)) {
					sendOpenApp(selectedItem.appPath)
				} else if (selectedItem.routerName === 'capturer') {
					ipc.send('COMMAND_TRIGGER_CAPTURER')
				} else {
					sendRouterNavigate(selectedItem.routerName)
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [searchResult, selectedIndex])

	if (searchResult.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-gray-400">
				No results found
			</div>
		)
	}

	return (
		<div className="p-3">
			<div className="grid grid-cols-6 gap-2">
				{searchResult.map((res, index) => (
					<div
						key={`${isApp(res) ? res.appPath : res.routerName}-${index}`}
						ref={element => {
							itemRefs.current[index] = element
						}}
					>
						{isApp(res) ? (
							<SApp app={res} isSelected={selectedIndex === index} />
						) : (
							<STool stool={res} isSelected={selectedIndex === index} />
						)}
					</div>
				))}
			</div>
		</div>
	)
}
