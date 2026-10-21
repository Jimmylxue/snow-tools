import { useMemo } from 'react'
import { SelectionRect, TSelectionHandle } from '../type'
import {
	getSelectionBounds,
	SELECTION_HANDLE_LAYOUT,
	SELECTION_HANDLE_SIZE,
} from '../utils/selection'

type TProps = {
	selection: SelectionRect
	showTools: boolean
	canvas: HTMLCanvasElement | null
	/** 画布设备像素 → CSS 像素的换算比例，画布还没上屏时作为兜底 */
	scaleFactor: number
	/** 只有选择工具下才允许拖动/缩放，避免画图时被手柄挡住 */
	interactive: boolean
	onResizeStart: (handle: TSelectionHandle, e: React.MouseEvent) => void
}

export function SelectionBorder({
	selection,
	showTools,
	canvas,
	scaleFactor,
	interactive,
	onResizeStart,
}: TProps) {
	const styles = useMemo(() => {
		if (!selection || !canvas) return {}

		const scaleX = canvas.clientWidth
			? canvas.clientWidth / canvas.width
			: 1 / scaleFactor
		const scaleY = canvas.clientHeight
			? canvas.clientHeight / canvas.height
			: 1 / scaleFactor
		const bounds = getSelectionBounds(selection)

		return {
			position: 'absolute' as const,
			left: `${bounds.left * scaleX}px`,
			top: `${bounds.top * scaleY}px`,
			width: `${bounds.width * scaleX}px`,
			height: `${bounds.height * scaleY}px`,
			border: showTools ? '1px solid #1E90FF' : '2px dashed red',
			/** 边框压在截图上，用一圈描边保证深色背景下也能看清选区 */
			boxShadow: showTools ? '0 0 0 1px rgba(255, 255, 255, 0.45)' : undefined,
			pointerEvents: 'none' as const,
		}
	}, [selection, canvas, showTools, scaleFactor])

	const showHandles = showTools && interactive

	return (
		<div style={styles}>
			{showHandles &&
				SELECTION_HANDLE_LAYOUT.map(item => (
					<div
						key={item.handle}
						title="拖动调整选区大小"
						onMouseDown={e => onResizeStart(item.handle, e)}
						className="absolute z-[56] rounded-[1px] border border-[#1E90FF] bg-white"
						style={{
							...item.style,
							width: SELECTION_HANDLE_SIZE,
							height: SELECTION_HANDLE_SIZE,
							cursor: item.cursor,
							pointerEvents: 'auto',
							boxShadow: '0 0 2px rgba(0, 0, 0, 0.35)',
						}}
					/>
				))}
		</div>
	)
}
