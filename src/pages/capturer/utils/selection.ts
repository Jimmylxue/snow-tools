import { SelectionRect, TSelectionHandle, TSelectionBounds } from '../type'

/** 选区允许缩到的最小边长（画布设备像素），低于初次框选的 10px 阈值，不会把选区判成无效 */
export const SELECTION_MIN_SIZE = 12

/** 手柄边长（CSS 像素），偏移取一半再多半个边框，手柄正好压在选区边框上 */
export const SELECTION_HANDLE_SIZE = 8
const HANDLE_OFFSET = -(SELECTION_HANDLE_SIZE / 2) - 1

/** 选区八个手柄的布局与光标，位置按 CSS 像素相对选区边框计算 */
export const SELECTION_HANDLE_LAYOUT: Array<{
	handle: TSelectionHandle
	cursor: string
	style: {
		left?: string | number
		top?: string | number
		right?: string | number
		bottom?: string | number
		transform?: string
	}
}> = [
	{
		handle: 'nw',
		cursor: 'nwse-resize',
		style: { left: HANDLE_OFFSET, top: HANDLE_OFFSET },
	},
	{
		handle: 'n',
		cursor: 'ns-resize',
		style: {
			left: '50%',
			top: HANDLE_OFFSET,
			transform: 'translateX(-50%)',
		},
	},
	{
		handle: 'ne',
		cursor: 'nesw-resize',
		style: { right: HANDLE_OFFSET, top: HANDLE_OFFSET },
	},
	{
		handle: 'e',
		cursor: 'ew-resize',
		style: {
			right: HANDLE_OFFSET,
			top: '50%',
			transform: 'translateY(-50%)',
		},
	},
	{
		handle: 'se',
		cursor: 'nwse-resize',
		style: { right: HANDLE_OFFSET, bottom: HANDLE_OFFSET },
	},
	{
		handle: 's',
		cursor: 'ns-resize',
		style: {
			left: '50%',
			bottom: HANDLE_OFFSET,
			transform: 'translateX(-50%)',
		},
	},
	{
		handle: 'sw',
		cursor: 'nesw-resize',
		style: { left: HANDLE_OFFSET, bottom: HANDLE_OFFSET },
	},
	{
		handle: 'w',
		cursor: 'ew-resize',
		style: {
			left: HANDLE_OFFSET,
			top: '50%',
			transform: 'translateY(-50%)',
		},
	},
]

/** 手柄按下的拖动过程中，全局都保持对应方向的缩放光标 */
export function getSelectionHandleCursor(handle: TSelectionHandle) {
	return (
		SELECTION_HANDLE_LAYOUT.find(item => item.handle === handle)?.cursor ??
		'nwse-resize'
	)
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), Math.max(min, max))
}

/** 选区统一转成左上角 + 宽高，反向框选（从右下往左上拖）也不会算错 */
export function getSelectionBounds(
	selection: SelectionRect,
): TSelectionBounds {
	const left = Math.min(selection.start.x, selection.end.x)
	const top = Math.min(selection.start.y, selection.end.y)

	return {
		left,
		top,
		width: Math.abs(selection.end.x - selection.start.x),
		height: Math.abs(selection.end.y - selection.start.y),
	}
}

/**
 * 归一化结果统一对齐到设备像素：边框不会落在半像素上发虚，
 * 导出裁切也不会因为四舍五入把边缘切掉一条。
 */
export function selectionFromBounds(bounds: TSelectionBounds): SelectionRect {
	const left = Math.round(bounds.left)
	const top = Math.round(bounds.top)

	return {
		start: { x: left, y: top },
		end: {
			x: left + Math.round(bounds.width),
			y: top + Math.round(bounds.height),
		},
	}
}

/**
 * 移动选区。dx / dy 是相对拖动起点（或按键步长）的位移，
 * 碰到画布边界就整块贴边停住，选区尺寸保持不变。
 */
export function moveSelection(
	bounds: TSelectionBounds,
	dx: number,
	dy: number,
	canvasSize: { width: number; height: number },
): SelectionRect {
	const maxLeft = Math.max(0, canvasSize.width - bounds.width)
	const maxTop = Math.max(0, canvasSize.height - bounds.height)

	return selectionFromBounds({
		left: clamp(bounds.left + dx, 0, maxLeft),
		top: clamp(bounds.top + dy, 0, maxTop),
		width: bounds.width,
		height: bounds.height,
	})
}

/**
 * 拖手柄缩放选区：拖边只动那条边，拖角同时动两条边，对边保持不动，
 * 所以选区不会跟着鼠标整体漂移。keepRatio 为 true 时按初始纵横比等比缩放。
 */
export function resizeSelection(
	bounds: TSelectionBounds,
	handle: TSelectionHandle,
	dx: number,
	dy: number,
	canvasSize: { width: number; height: number },
	options?: { minSize?: number; keepRatio?: boolean },
): SelectionRect {
	const minSize = options?.minSize ?? SELECTION_MIN_SIZE
	const hasX = handle.includes('e') || handle.includes('w')
	const hasY = handle.includes('n') || handle.includes('s')

	let left = bounds.left
	let right = bounds.left + bounds.width
	let top = bounds.top
	let bottom = bounds.top + bounds.height

	if (handle.includes('e')) {
		right = clamp(right + dx, left + minSize, canvasSize.width)
	} else if (handle.includes('w')) {
		left = clamp(left + dx, 0, right - minSize)
	}

	if (handle.includes('s')) {
		bottom = clamp(bottom + dy, top + minSize, canvasSize.height)
	} else if (handle.includes('n')) {
		top = clamp(top + dy, 0, bottom - minSize)
	}

	/** 按住 Shift 拖角：锁定初始纵横比，以拖角方向的对角为锚点 */
	if (
		options?.keepRatio &&
		hasX &&
		hasY &&
		bounds.width > 0 &&
		bounds.height > 0
	) {
		const ratio = bounds.width / bounds.height
		const anchorX = handle.includes('e')
			? bounds.left
			: bounds.left + bounds.width
		const anchorY = handle.includes('s')
			? bounds.top
			: bounds.top + bounds.height
		/** 锚点到画布边缘的距离，等比放大时不能超出 */
		const limitX = handle.includes('e')
			? canvasSize.width - anchorX
			: anchorX
		const limitY = handle.includes('s')
			? canvasSize.height - anchorY
			: anchorY
		const upper = Math.min(limitX, limitY * ratio)

		/** 锚点贴着画布边缘时等比缩放没有意义，退回普通缩放 */
		if (upper >= minSize) {
			/** 取相对初始尺寸变化更大的那一轴作为主导，手感更跟手 */
			const scaleFromX = (right - left) / bounds.width
			const scaleFromY = (bottom - top) / bounds.height
			const scale =
				Math.abs(scaleFromX - 1) >= Math.abs(scaleFromY - 1)
					? scaleFromX
					: scaleFromY

			const width = Math.min(Math.max(bounds.width * scale, minSize), upper)
			const height = width / ratio

			if (handle.includes('e')) {
				left = anchorX
				right = anchorX + width
			} else {
				left = anchorX - width
				right = anchorX
			}

			if (handle.includes('s')) {
				top = anchorY
				bottom = anchorY + height
			} else {
				top = anchorY - height
				bottom = anchorY
			}
		}
	}

	return selectionFromBounds({
		left,
		top,
		width: right - left,
		height: bottom - top,
	})
}
