import { useMemo } from 'react'
import { SelectionRect } from '../type'
import { TCapturerMessage } from '../oberver'

type TProps = {
	selection: SelectionRect
	containerRect?: DOMRect
	source?: TCapturerMessage
}

export function SelectionSize({ selection, containerRect, source }: TProps) {
	const { start, end } = selection
	const width = Math.abs(end.x - start.x).toFixed(2)
	const height = Math.abs(end.y - start.y).toFixed(2)

	const margin = 10 / (source?.scaleFactor ?? 1)

	const sizeHeight = 30 / (source?.scaleFactor ?? 1)

	const computed = useMemo(() => {
		if (!source) return

		const { start, end } = selection
		const selectionBottom = Math.max(
			start.y / source.scaleFactor,
			end.y / source.scaleFactor
		)
		const selectionTop = Math.min(
			start.y / source.scaleFactor,
			end.y / source.scaleFactor
		)

		const spaceBelow = containerRect!.height - selectionBottom - margin
		const spaceAbove = selectionTop - margin

		let top: number
		const left = start.x / source.scaleFactor

		if (spaceAbove >= sizeHeight) {
			top = selectionTop - sizeHeight - margin
		} else if (spaceBelow >= sizeHeight) {
			top = selectionBottom + margin
		} else {
			top = selectionTop + margin
		}
		return {
			left,
			top,
		}
	}, [containerRect, selection, source, margin, sizeHeight])

	return (
		<div
			id="dzs"
			className="absolute flex items-center min-w-[100px] rounded-md bg-gray-800 px-2 text-xs text-white"
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
