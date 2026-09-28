export type Tool = 'select' | 'draw' | 'erase' | 'rect' | 'text'

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
