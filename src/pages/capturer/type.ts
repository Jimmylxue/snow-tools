export type Tool = 'select' | 'draw' | 'erase' | 'rect'

export type Position = {
	x: number
	y: number
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
	e: React.MouseEvent
	x: number
	y: number
}
