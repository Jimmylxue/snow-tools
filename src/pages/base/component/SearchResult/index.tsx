import { TApp } from 'electron/biz/apps/type'
import { TTools } from '../../type'
import { STool } from '../STool'
import { SApp } from '../SApp'
import { useEffect, useState } from 'react'
import { sendOpenApp, sendRouterNavigate } from '@/hooks/ipc/window'

type TProps = {
	searchResult: (TApp | TTools)[]
}

export function SearchResult({ searchResult }: TProps) {
	const [selectedIndex, setSelectedIndex] = useState(0)

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const cols = 6 // Number of columns in grid
			const totalItems = searchResult.length

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
			} else if (e.key === 'Enter' && searchResult.length > 0) {
				console.log(`Executing: ${searchResult[selectedIndex]}`)
				const selectedItem = searchResult[selectedIndex]
				const isApp = (selectedItem as TApp).nativePath
				if (isApp) {
					sendOpenApp((selectedItem as TApp).appName)
				} else {
					sendRouterNavigate((selectedItem as TTools).routerName)
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [searchResult, selectedIndex])

	return (
		<div className="p-3">
			{searchResult.length === 0 ? (
				<div className="flex items-center justify-center h-full text-gray-400">
					No tools found
				</div>
			) : (
				<div className="grid grid-cols-6 gap-2">
					{searchResult.map((res, index) => {
						const isApp = (res as TApp).nativePath
						const isSelected = selectedIndex === index
						return (
							<div key={index}>
								{isApp ? (
									<SApp app={res as TApp} isSelected={isSelected} />
								) : (
									<STool stool={res as TTools} isSelected={isSelected} />
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
