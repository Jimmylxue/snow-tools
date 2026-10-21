export type Tool = 'select' | 'draw' | 'rect' | 'text' | 'mosaic' | 'eraser'

export type Position = {
	x: number
	y: number
}

/** 文字标注，坐标与字号均为画布设备像素，rotation 为绕文字包围盒中心的顺时针角度 */
export type TTextAnnotation = {
	x: number
	y: number
	content: string
	color: string
	size: number
	rotation: number
}

export type TTextTransform =
	| { mode: 'move'; index: number; offsetX: number; offsetY: number }
	| {
		mode: 'scale'
		index: number
		centerX: number
		centerY: number
		startDistance: number
		startSize: number
		startWidth: number
		startHeight: number
	}
	| {
		mode: 'rotate'
		index: number
		centerX: number
		centerY: number
		startAngle: number
		startRotation: number
	}

export type SelectionRect = {
	start: Position
	end: Position
}

/** 选区统一成左上角 + 宽高，反向框选也不会算错 */
export type TSelectionBounds = {
	left: number
	top: number
	width: number
	height: number
}

/** 选区可拖动的八个缩放手柄，n/s/e/w 为边缘中点，其余为四角 */
export type TSelectionHandle =
	| 'nw'
	| 'n'
	| 'ne'
	| 'e'
	| 'se'
	| 's'
	| 'sw'
	| 'w'

/** 拖动选区本体（move）或拖动某个手柄（resize），坐标均为画布设备像素 */
export type TSelectionDrag =
	| {
		mode: 'move'
		/** 按下瞬间的选区边界，作为整段拖动的基准，避免逐帧累加误差 */
		bounds: TSelectionBounds
		originX: number
		originY: number
	}
	| {
		mode: 'resize'
		/** 按下的缩放手柄 */
		handle: TSelectionHandle
		bounds: TSelectionBounds
		originX: number
		originY: number
	}

/** 画笔类笔画；涂鸦、马赛克、橡皮擦存在同一个有序数组里，层序才正确 */
export type TPaintStroke =
	| { kind: 'pen'; path: Position[]; color: string; width: number }
	| { kind: 'mosaic'; path: Position[]; width: number }
	| { kind: 'eraser'; path: Position[]; width: number }

export type TAbsolutePosition = {
	left: number
	top: number
}

export type TCurrentMouseInfo = {
	clientX: number
	clientY: number
	x: number
	y: number
}
