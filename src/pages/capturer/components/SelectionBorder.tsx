import { useMemo } from 'react'
import { SelectionRect } from '../type'

type TProps = {
	selection: SelectionRect
	showTools: boolean
	canvas: HTMLCanvasElement | null
}

export function SelectionBorder({ selection, showTools, canvas }: TProps) {
	const styles = useMemo(() => {
		if (!selection || !canvas) return {}

		const scaleX = canvas.clientWidth / canvas.width
		const scaleY = canvas.clientHeight / canvas.height

		const { start, end } = selection
		const left = Math.min(start.x, end.x) * scaleX
		const top = Math.min(start.y, end.y) * scaleY
		const width = Math.abs(end.x - start.x) * scaleX
		const height = Math.abs(end.y - start.y) * scaleY

		return {
			position: 'absolute' as const,
			left: `${left}px`,
			top: `${top}px`,
			width: `${width}px`,
			height: `${height}px`,
			border: showTools ? '2px solid red' : '2px dashed red',
			// backgroundColor: 'rgba(255, 255, 255, 0.3)',
			pointerEvents: 'none' as const,
		}
	}, [selection, canvas, showTools])

	return <div style={styles} />
}
