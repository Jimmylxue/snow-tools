import { Position, SelectionRect } from '../type'

export function drawCanvasImage(
	canvas: HTMLCanvasElement,
	backgroundImage: HTMLImageElement,
	rectangles: Array<{
		start: Position
		end: Position
		color: string
		width: number
	}>,
	selection: SelectionRect | null,
	currentRectangle: {
		start: Position
		end: Position
		color: string
		width: number
	} | null,
	drawings: Array<{ path: Position[]; color: string; width: number }>,
	currentDrawing: {
		path: Position[]
		color: string
		width: number
	} | null
) {
	const ctx = canvas.getContext('2d')!
	ctx.clearRect(0, 0, canvas.width, canvas.height)

	// 1. 首先绘制原始图像
	ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height)

	// 2. 如果有选区，处理变暗效果
	if (selection) {
		ctx.save()

		const { start, end } = selection
		const x = Math.min(start.x, end.x)
		const y = Math.min(start.y, end.y)
		const width = Math.abs(end.x - start.x)
		const height = Math.abs(end.y - start.y)

		// 3. 创建变暗效果（选区外的区域）
		// 3.1 绘制整个画布变暗
		ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
		ctx.fillRect(0, 0, canvas.width, canvas.height)

		// 3.2 使用合成模式恢复选区内的亮度
		ctx.globalCompositeOperation = 'destination-out'
		ctx.fillRect(x, y, width, height)

		// 4. 恢复合成模式并绘制选区边框
		// ctx.globalCompositeOperation = 'source-over'
		// ctx.strokeStyle = 'red'
		// ctx.lineWidth = 2
		// ctx.setLineDash([5, 5])
		// ctx.strokeRect(x, y, width, height)
		// ctx.setLineDash([])

		ctx.restore()

		// 5. 重新绘制选区内的原始图像（保持亮度）
		ctx.save()
		ctx.beginPath()
		ctx.rect(x, y, width, height)
		ctx.closePath()
		ctx.clip()
		ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height)
		ctx.restore()
	}

	// 绘制所有已保存的矩形
	rectangles.forEach(rect => {
		const x = Math.min(rect.start.x, rect.end.x)
		const y = Math.min(rect.start.y, rect.end.y)
		const width = Math.abs(rect.end.x - rect.start.x)
		const height = Math.abs(rect.end.y - rect.start.y)

		ctx.strokeStyle = rect.color
		ctx.lineWidth = rect.width
		ctx.strokeRect(x, y, width, height)
	})

	// 绘制当前正在绘制的矩形
	if (currentRectangle) {
		const x = Math.min(currentRectangle.start.x, currentRectangle.end.x)
		const y = Math.min(currentRectangle.start.y, currentRectangle.end.y)
		const width = Math.abs(currentRectangle.end.x - currentRectangle.start.x)
		const height = Math.abs(currentRectangle.end.y - currentRectangle.start.y)

		ctx.strokeStyle = currentRectangle.color
		ctx.lineWidth = currentRectangle.width
		ctx.strokeRect(x, y, width, height)
	}

	// 绘制所有已保存的绘画（保持不变）
	drawings.forEach(drawing => {
		if (drawing.path.length < 2) return
		ctx.strokeStyle = drawing.color
		ctx.lineWidth = drawing.width
		ctx.lineJoin = 'round'
		ctx.lineCap = 'round'
		ctx.beginPath()
		ctx.moveTo(drawing.path[0].x, drawing.path[0].y)
		for (let i = 1; i < drawing.path.length; i++) {
			ctx.lineTo(drawing.path[i].x, drawing.path[i].y)
		}
		ctx.stroke()
	})

	// 绘制当前正在进行的绘画（保持不变）
	if (currentDrawing && currentDrawing.path.length >= 2) {
		ctx.strokeStyle = currentDrawing.color
		ctx.lineWidth = currentDrawing.width
		ctx.lineJoin = 'round'
		ctx.lineCap = 'round'
		ctx.beginPath()
		ctx.moveTo(currentDrawing.path[0].x, currentDrawing.path[0].y)
		for (let i = 1; i < currentDrawing.path.length; i++) {
			ctx.lineTo(currentDrawing.path[i].x, currentDrawing.path[i].y)
		}
		ctx.stroke()
	}
}
