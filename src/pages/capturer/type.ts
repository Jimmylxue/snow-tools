export type Tool = 'select' | 'draw' | 'erase'

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
