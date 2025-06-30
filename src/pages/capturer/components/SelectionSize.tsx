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
	const width = Math.abs(end.x - start.x)
	const height = Math.abs(end.y - start.y)

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
	console.log('computed', computed)
	return (
		<div
			id="dzs"
			className={` absolute text-white text-xs bg-gray-800 px-2 min-w-[100px] rounded-md h-[${sizeHeight}px] flex items-center`}
			style={{
				left: `${computed?.left ?? -9999}px`,
				top: `${computed?.top ?? -9999}px`,
			}}
		>
			{width}px * {height}px
		</div>
	)
}
