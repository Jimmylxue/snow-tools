export type TCaptureSaveParams = {
	id: string
	/** 渲染层合成好（含框选/涂鸦/文字）的选区 PNG */
	source: Uint8Array
	size: {
		width: number
		height: number
	}
	position: {
		x: number
		y: number
	}
	pixelBounds: {
		x: number
		y: number
		width: number
		height: number
	}
}
