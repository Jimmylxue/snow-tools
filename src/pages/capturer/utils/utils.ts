export type TClientPoint = {
	clientX: number
	clientY: number
}

/**
 * 把鼠标的客户端坐标换算成画布设备像素。
 * 只依赖 clientX / clientY，React 事件和原生 MouseEvent 都能直接传进来。
 */
export function getScaledPosition(
	e: TClientPoint,
	htmlCanvas: HTMLCanvasElement | null
) {
	if (!htmlCanvas) return { x: 0, y: 0 }

	const canvas = htmlCanvas
	const rect = canvas.getBoundingClientRect()
	const scaleX = canvas.width / rect.width
	const scaleY = canvas.height / rect.height

	return {
		x: (e.clientX - rect.left) * scaleX,
		y: (e.clientY - rect.top) * scaleY,
	}
}
