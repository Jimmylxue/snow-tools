export function getScaledPosition(
	e: React.MouseEvent,
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
