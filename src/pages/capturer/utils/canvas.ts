import { Position, SelectionRect, TPaintStroke, TTextAnnotation } from '../type'

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

/** 马赛克的像素块大小（画布设备像素） */
const MOSAIC_BLOCK_SIZE = 14

let paintCache: {
	background: HTMLImageElement
	width: number
	height: number
	pixelated: HTMLCanvasElement
	committed: HTMLCanvasElement
	frame: HTMLCanvasElement
	/** 用来判断已提交图层是否需要重建 */
	committedPaints: TPaintStroke[] | null
} | null = null

function createLayerCanvas(width: number, height: number) {
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	return canvas
}

/** 像素化底图 + 已提交图层 + 当前帧图层，只在背景或尺寸变化时重建 */
function getPaintCache(
	background: HTMLImageElement,
	width: number,
	height: number,
) {
	if (
		paintCache &&
		paintCache.background === background &&
		paintCache.width === width &&
		paintCache.height === height
	) {
		return paintCache
	}

	const block = Math.max(2, Math.round(MOSAIC_BLOCK_SIZE))
	const small = document.createElement('canvas')
	small.width = Math.max(1, Math.ceil(width / block))
	small.height = Math.max(1, Math.ceil(height / block))
	small
		.getContext('2d', { colorSpace: 'display-p3' })!
		.drawImage(background, 0, 0, small.width, small.height)

	const pixelated = createLayerCanvas(width, height)
	const pixelatedCtx = pixelated.getContext('2d', {
		colorSpace: 'display-p3',
	})!
	pixelatedCtx.imageSmoothingEnabled = false
	pixelatedCtx.drawImage(small, 0, 0, width, height)

	paintCache = {
		background,
		width,
		height,
		pixelated,
		committed: createLayerCanvas(width, height),
		frame: createLayerCanvas(width, height),
		committedPaints: null,
	}

	return paintCache
}

/**
 * 把一条笔画画到标注图层上。
 * 马赛克用像素化底图当 strokeStyle 的 pattern，坐标和画布对齐，
 * 这样一条普通 stroke 就能直接把马赛克"刷"进同一条有序图层。
 */
function drawPaintStroke(
	ctx: CanvasRenderingContext2D,
	stroke: TPaintStroke,
	pixelated: HTMLCanvasElement,
) {
	if (stroke.path.length === 0) return

	ctx.save()
	ctx.lineCap = 'round'
	ctx.lineJoin = 'round'
	ctx.lineWidth = stroke.width

	if (stroke.kind === 'eraser') {
		ctx.globalCompositeOperation = 'destination-out'
		ctx.strokeStyle = '#000'
		ctx.fillStyle = '#000'
	} else if (stroke.kind === 'mosaic') {
		const pattern = ctx.createPattern(pixelated, 'no-repeat')

		if (!pattern) {
			ctx.restore()
			return
		}

		ctx.strokeStyle = pattern
		ctx.fillStyle = pattern
	} else {
		ctx.strokeStyle = stroke.color
		ctx.fillStyle = stroke.color
	}

	ctx.beginPath()

	if (stroke.path.length === 1) {
		ctx.arc(
			stroke.path[0].x,
			stroke.path[0].y,
			stroke.width / 2,
			0,
			Math.PI * 2,
		)
		ctx.fill()
		ctx.restore()
		return
	}

	ctx.moveTo(stroke.path[0].x, stroke.path[0].y)
	for (let index = 1; index < stroke.path.length; index += 1) {
		ctx.lineTo(stroke.path[index].x, stroke.path[index].y)
	}
	ctx.stroke()

	ctx.restore()
}

/** 已提交笔画只在新增笔画时重绘一次，绘制过程中直接复用 */
function getCommittedLayer(
	cache: NonNullable<typeof paintCache>,
	paints: TPaintStroke[],
) {
	if (cache.committedPaints === paints) {
		return cache.committed
	}

	const ctx = cache.committed.getContext('2d', { colorSpace: 'display-p3' })!
	ctx.clearRect(0, 0, cache.width, cache.height)

	for (const stroke of paints) {
		drawPaintStroke(ctx, stroke, cache.pixelated)
	}

	cache.committedPaints = paints

	return cache.committed
}

function drawPaintLayers(
	ctx: CanvasRenderingContext2D,
	background: HTMLImageElement,
	width: number,
	height: number,
	paints: TPaintStroke[],
	current: TPaintStroke | null,
) {
	if (paints.length === 0 && !current) return

	const cache = getPaintCache(background, width, height)
	const committed = getCommittedLayer(cache, paints)
	const frameCtx = cache.frame.getContext('2d', { colorSpace: 'display-p3' })!

	frameCtx.clearRect(0, 0, width, height)
	frameCtx.drawImage(committed, 0, 0)

	if (current) {
		drawPaintStroke(frameCtx, current, cache.pixelated)
	}

	ctx.drawImage(cache.frame, 0, 0)
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
	paints: TPaintStroke[],
	currentPaint: TPaintStroke | null,
	texts: TTextAnnotation[],
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

	// 画笔 / 马赛克 / 橡皮擦压在同一条有序图层上，压在矩形之上、文字之下
	drawPaintLayers(
		ctx,
		backgroundImage,
		canvas.width,
		canvas.height,
		paints,
		currentPaint,
	)

	// 绘制文字标注（最后绘制，保证压在图形之上）
	texts.forEach(text => {
		if (text.content) {
			drawTextAnnotation(ctx, text)
		}
	})
}
