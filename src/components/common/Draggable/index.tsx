import { getIpc } from '@/hooks/ipc'
import { useElectron } from '@/hooks/useElectron'
import { useState, useEffect, ReactNode } from 'react'

const ipc = getIpc()

type TProps = {
	children: ReactNode
}

export function Draggable({ children }: TProps) {
	const { windowId } = useElectron()
	const [isDragging, setIsDragging] = useState(false)
	const [offset, setOffset] = useState({ x: 0, y: 0 })

	const handleMouseDown = (e: React.MouseEvent) => {
		e.stopPropagation()
		e.preventDefault()
		if (e.button !== 0) return
		setIsDragging(true)
		setOffset({
			x: e.screenX - window.screenX,
			y: e.screenY - window.screenY,
		})

		// 防止文本选中
		// e.preventDefault()
		// 同时阻止冒泡和默认行为
	}

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			e.preventDefault()
			e.stopPropagation()
			if (isDragging) {
				ipc.send(`window-move-${windowId}`, {
					x: e.screenX - offset.x,
					y: e.screenY - offset.y,
				})
			}
		}

		const handleMouseUp = () => {
			setIsDragging(false)
		}

		// 使用window监听，确保即使鼠标移出组件也能继续拖动
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove)
			window.addEventListener('mouseup', handleMouseUp)
		}

		return () => {
			window.removeEventListener('mousemove', handleMouseMove)
			window.removeEventListener('mouseup', handleMouseUp)
		}
	}, [isDragging, offset])

	return (
		<div
			onMouseDown={handleMouseDown}
			className=" h-screen"
			style={{
				cursor: isDragging ? 'grabbing' : 'grab',
				backgroundColor: '#f0f0f0',
				userSelect: 'none', // 防止拖动时选中文本
			}}
		>
			{children}
		</div>
	)
}
