import { useMemo } from 'react'
import { SelectionRect } from '../type'
import { TCapturerMessage } from '../oberver'
import { getSelectionBounds } from '../utils/selection'

type TProps = {
	selection: SelectionRect
	containerRect?: DOMRect
	source?: TCapturerMessage
}

/** 尺寸标签的宽度，用来在贴近屏幕右侧时把标签拉回可视区 */
const LABEL_WIDTH = 108

export function SelectionSize({ selection, containerRect, source }: TProps) {
	const bounds = getSelectionBounds(selection)
	const width = Math.abs(selection.end.x - selection.start.x).toFixed(2)
	const height = Math.abs(selection.end.y - selection.start.y).toFixed(2)

	const scaleFactor = source?.scaleFactor ?? 1
	/** 标签按 CSS 像素排版，间距和高度都随缩放系数折算，视觉大小才稳定 */
	const margin = 10 / scaleFactor
	const sizeHeight = 30 / scaleFactor

	const computed = useMemo(() => {
		if (!source || !containerRect) return

		const selectionTop = bounds.top / source.scaleFactor
		const selectionBottom =
			(bounds.top + bounds.height) / source.scaleFactor

		const spaceBelow = containerRect.height - selectionBottom - margin
		const spaceAbove = selectionTop - margin

		let top: number

		if (spaceAbove >= sizeHeight) {
			top = selectionTop - sizeHeight - margin
		} else if (spaceBelow >= sizeHeight) {
			top = selectionBottom + margin
		} else {
			top = selectionTop + margin
		}

		/** 选区贴右边缘时标签会伸出屏幕，往回拉一点 */
		const left = Math.min(
			bounds.left / source.scaleFactor,
			Math.max(0, containerRect.width - LABEL_WIDTH),
		)

		return {
			left,
			top,
		}
	}, [bounds, containerRect, source, margin, sizeHeight])

	return (
		<div
			id="dzs"
			className="absolute flex items-center min-w-[100px] rounded-md bg-gray-800 px-2 text-xs text-white tabular-nums pointer-events-none"
			style={{
				height: `${sizeHeight}px`,
				left: `${computed?.left ?? -9999}px`,
				top: `${computed?.top ?? -9999}px`,
			}}
		>
			{width}px * {height}px
		</div>
	)
}
