import { Position, SelectionRect, TTextAnnotation } from '../type'

/** 输入框预览和画布最终渲染必须用同一套字体设置，否则提交后位置会跳 */
export const CAPTURER_TEXT_FONT_FAMILY =
	'-apple-system, "PingFang SC", "Helvetica Neue", sans-serif'
export const CAPTURER_TEXT_LINE_HEIGHT = 1.3
/** 文字虚拟边框四周等量留白 */
export const CAPTURER_TEXT_BOX_PADDING = 4

function drawTextAnnotation(
	ctx: CanvasRenderingContext2D,
	text: TTextAnnotation,
) {
	const { width, height } = getCanvasTextBounds(text.content, text.size)

	ctx.save()
	ctx.font = `${text.size}px ${CAPTURER_TEXT_FONT_FAMILY}`
	ctx.fillStyle = text.color
	ctx.textBaseline = 'top'

	/** 以包围盒中心为锚点旋转，和 DOM 边框层的 transform-origin 保持一致 */
	ctx.translate(text.x + width / 2, text.y + height / 2)
	ctx.rotate(((text.rotation || 0) * Math.PI) / 180)
	ctx.translate(-width / 2, -height / 2)

	text.content.split('\n').forEach((line, index) => {
		ctx.fillText(line, 0, index * text.size * CAPTURER_TEXT_LINE_HEIGHT)
	})

	ctx.restore()
}

let measureCanvas: HTMLCanvasElement | null = null

function getMeasureContext() {
	if (typeof document === 'undefined') {
		return null
	}

	measureCanvas = measureCanvas ?? document.createElement('canvas')

	return measureCanvas.getContext('2d')
}

/** 量一段文字的包围盒，字体设置必须和绘制时一致 */
export function measureTextSize(content: string, size: number) {
	const ctx = getMeasureContext()
	const lines = content.length ? content.split('\n') : ['']

	if (!ctx) {
		return { width: 0, height: lines.length * size * CAPTURER_TEXT_LINE_HEIGHT }
	}

	ctx.font = `${size}px ${CAPTURER_TEXT_FONT_FAMILY}`

	return {
		width: lines.reduce(
			(max, line) => Math.max(max, ctx.measureText(line).width),
			0,
		),
		height: lines.length * size * CAPTURER_TEXT_LINE_HEIGHT,
	}
}

/**
 * 画布上文字实际占用的包围盒。
 * canvas 用 textBaseline: 'top' 逐行绘制，行高余量全落在最后一行下方，
 * 所以字形高度不是 行数 * 行高。
 */
export function getCanvasTextBounds(content: string, size: number) {
	const { width } = measureTextSize(content, size)
	const lines = content.length ? content.split('\n') : ['']

	return {
		width,
		height: (lines.length - 1) * size * CAPTURER_TEXT_LINE_HEIGHT + size,
	}
}

/**
 * 从已合成标注的画布上按选区裁出设备像素图，
 * 主进程拿到的就是最终结果，不再二次截屏
 */
export function cropCanvasToPngBytes(
	canvas: HTMLCanvasElement,
	rect: { x: number; y: number; width: number; height: number },
) {
	const offscreen = document.createElement('canvas')
	offscreen.width = rect.width
	offscreen.height = rect.height

	const ctx = offscreen.getContext('2d', {
		colorSpace: 'display-p3',
	})!
	ctx.drawImage(
		canvas,
		rect.x,
		rect.y,
		rect.width,
		rect.height,
		0,
		0,
		rect.width,
		rect.height,
	)

	return new Promise<Uint8Array>((resolve, reject) => {
		offscreen.toBlob(async blob => {
			if (!blob) {
				reject(new Error('选区导出失败：canvas.toBlob 返回空'))
				return
			}

			resolve(new Uint8Array(await blob.arrayBuffer()))
		}, 'image/png')
	})
}

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
	} | null,
	texts: TTextAnnotation[]
) {
	const ctx = canvas.getContext('2d', { colorSpace: 'display-p3' })!
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

	// 绘制文字标注（最后绘制，保证压在图形之上）
	texts.forEach(text => {
		if (text.content) {
			drawTextAnnotation(ctx, text)
		}
	})
}
