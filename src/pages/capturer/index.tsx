import { useEffect, useState, useRef, useCallback } from 'react'
import {
	sendCaptureHover,
	sendCaptureSave,
	sendRouterClose,
} from '@/hooks/ipc/window'
import { ToolBar } from './components/ToolBar'
import { PixelColor } from './components/PixelColor'
import {
	Position,
	SelectionRect,
	TCurrentMouseInfo,
	TPaintStroke,
	Tool,
	TSelectionBounds,
	TSelectionDrag,
	TSelectionHandle,
	TTextAnnotation,
	TTextTransform,
} from './type'
import { SelectionBorder } from './components/SelectionBorder'
import {
	capturerCloseObserve,
	capturerObserve,
	TCapturerMessage,
} from './oberver'
import { v4 as uuidv4 } from 'uuid'
import { getIpc } from '@/hooks/ipc'
import { SelectionSize } from './components/SelectionSize'
import {
	cropCanvasToPngBytes,
	drawCanvasImage,
	getCanvasTextBounds,
	measureTextSize,
	CAPTURER_TEXT_BOX_PADDING,
	CAPTURER_TEXT_FONT_FAMILY,
	CAPTURER_TEXT_LINE_HEIGHT,
} from './utils/canvas'
import { getScaledPosition } from './utils/utils'
import {
	getSelectionBounds,
	getSelectionHandleCursor,
	moveSelection,
	resizeSelection,
	selectionFromBounds,
} from './utils/selection'

const ipc = getIpc()

/** 文字边框四角的缩放手柄 */
const TEXT_SCALE_HANDLES = [
	{ position: 'left-[-4px] top-[-4px]', cursor: 'nwse-resize' },
	{ position: 'right-[-4px] top-[-4px]', cursor: 'nesw-resize' },
	{ position: 'left-[-4px] bottom-[-4px]', cursor: 'nesw-resize' },
	{ position: 'right-[-4px] bottom-[-4px]', cursor: 'nwse-resize' },
]

export function Capturer() {
	/** 截图的 图片资源 */
	const [source, setSource] = useState<TCapturerMessage>()
	const [isSelecting, setIsSelecting] = useState(false)
	const [selection, setSelection] = useState<SelectionRect | null>(null)
	const [showTools, setShowTools] = useState(false)
	const [activeTool, setActiveTool] = useState<Tool>('select')
	const [drawing, setDrawing] = useState(false)
	const [currentMouseInfo, setCurrentMouseInfo] = useState<TCurrentMouseInfo>()
	const [backgroundImage, setBackgroundImage] =
		useState<HTMLImageElement | null>(null)
	/** 画笔颜色 */
	const [drawColor, setDrawColor] = useState('#ff0000')
	/** 画笔宽度 */
	const [drawWidth, setDrawWidth] = useState(3)
	/** 字号，按用户感知的 CSS 像素计，落到画布时再乘 scaleFactor */
	const [fontSize, setFontSize] = useState(20)
	/** 已提交的文字标注 */
	const [texts, setTexts] = useState<TTextAnnotation[]>([])
	/** 涂鸦 / 马赛克 / 橡皮擦，按创建顺序存同一个数组，层序才正确 */
	const [paints, setPaints] = useState<TPaintStroke[]>([])
	const [currentPaint, setCurrentPaint] = useState<TPaintStroke | null>(null)
	const [mosaicWidth, setMosaicWidth] = useState(32)
	/** 橡皮擦笔刷宽度（画布设备像素） */
	const [eraserWidth, setEraserWidth] = useState(32)
	/** 光标是否在画布上，用于决定要不要显示画笔圆圈 */
	const [isHoveringCanvas, setIsHoveringCanvas] = useState(false)
	/** 正在输入的文字落点（设备像素），null 表示没有输入框 */
	const [editingText, setEditingText] = useState<Position | null>(null)
	const [textDraft, setTextDraft] = useState('')
	/** 正在对文字做的操作：移动 / 缩放 / 旋转 */
	const [textTransform, setTextTransform] = useState<TTextTransform | null>(
		null,
	)
	/** 当前选中的文字下标，按 Delete / Backspace 整条删除 */
	const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(
		null,
	)
	/** 正在拖动选区（移动）或拖动缩放手柄（resize），null 表示没在拖 */
	const [selectionDrag, setSelectionDrag] = useState<TSelectionDrag | null>(
		null,
	)
	const textInputRef = useRef<HTMLTextAreaElement>(null)

	const visibleCanvasRef = useRef<HTMLCanvasElement>(null)
	/** 在已确认选区外重新框选时，暂存旧选区：误点松开后可以还原 */
	const restoreSelectionRef = useRef<SelectionRect | null>(null)
	const mouseInfoFrameRef = useRef<number | null>(null)
	const latestMouseInfoRef = useRef<TCurrentMouseInfo>()
	const drawFrameRef = useRef<number | null>(null)

	const containerRef = useRef<HTMLDivElement>(null)
	const containerRect = containerRef?.current?.getBoundingClientRect()

	const [rectangles, setRectangles] = useState<
		Array<{ start: Position; end: Position; color: string; width: number }>
	>([])
	const [currentRectangle, setCurrentRectangle] = useState<{
		start: Position
		end: Position
		color: string
		width: number
	} | null>(null)

	// 处理截屏通知
	useEffect(() => {
		return capturerObserve.subscribe(content => {
			ipc.send('CAPTURE_LOG', 'USE EFFECT GET TRIGGER')
			setSource(content)
		})
	}, [])

	useEffect(() => {
		return capturerCloseObserve.subscribe(() => {
			setActiveTool('select')
			setSource(undefined)
			setCurrentMouseInfo(undefined)
			setSelection(null)
			setShowTools(false)
			setPaints([])
			setCurrentPaint(null)
			setRectangles([])
			setCurrentRectangle(null)
			setTexts([])
			setEditingText(null)
			setTextDraft('')
			setTextTransform(null)
			setSelectedTextIndex(null)
			setSelectionDrag(null)
			restoreSelectionRef.current = null
		})
	}, [])

	// 开始区域选择
	const startRegionSelection = useCallback(() => {
		setIsSelecting(true)
		setSelection(null)
		setShowTools(false)
		setPaints([])
		setCurrentPaint(null)
		setSelectionDrag(null)
		restoreSelectionRef.current = null
	}, [])

	useEffect(() => {
		if (!source?.source || !visibleCanvasRef.current) return

		const objectUrl = URL.createObjectURL(
			new Blob([Uint8Array.from(source.source)], { type: 'image/png' }),
		)
		const img = new Image()
		img.onload = () => {
			setBackgroundImage(img)
			const visibleCanvas = visibleCanvasRef.current!
			visibleCanvas.width = img.naturalWidth
			visibleCanvas.height = img.naturalHeight
			visibleCanvas.style.width = `${img.naturalWidth / source.scaleFactor}px`
			visibleCanvas.style.height = `${img.naturalHeight / source.scaleFactor}px`
			const visibleCtx = visibleCanvas.getContext('2d', {
				colorSpace: 'display-p3',
			})!
			visibleCtx.drawImage(img, 0, 0)
			/**
			 * 等这一帧真正合成上屏再显示窗口，否则会闪一帧白底
			 */
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					ipc.send('SHOW_CAPTURER_SCREEN')
					startRegionSelection()
				})
			})
		}
		img.src = objectUrl

		return () => {
			URL.revokeObjectURL(objectUrl)
		}
	}, [source, startRegionSelection])

	const commitEditingText = useCallback(() => {
		if (!editingText) return

		const content = textDraft.replace(/\s+$/, '')

		if (content) {
			setTexts(prev => [
				...prev,
				{
					...editingText,
					content,
					color: drawColor,
					size: Math.round(fontSize * (source?.scaleFactor ?? 1)),
					rotation: 0,
				},
			])
		}

		setEditingText(null)
		setTextDraft('')
	}, [editingText, textDraft, drawColor, fontSize, source])

	/**
	 * mousedown 的默认行为会在 React 提交之后把焦点抢回 body，
	 * 导致输入框刚挂载就 blur 消失，所以这里在事件结束后显式聚焦
	 */
	useEffect(() => {
		if (editingText) {
			textInputRef.current?.focus()
		}
	}, [editingText])

	const handleTextKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		/** Enter 交给 textarea 换行，失焦或保存时提交 */
		if (e.key === 'Escape') {
			e.preventDefault()
			e.stopPropagation()
			setEditingText(null)
			setTextDraft('')
		}
	}

	/** 工具按钮按复选处理：再点一次当前工具即取消选择，回到无工具状态 */
	const toggleTool = (tool: 'rect' | 'draw' | 'text' | 'mosaic' | 'eraser') => {
		setSelectedTextIndex(null)
		setActiveTool(activeTool === tool ? 'select' : tool)
	}

	/** 按住文字边框移动，拖四角缩放，拖顶部手柄旋转 */
	const startTextTransform = (
		mode: TTextTransform['mode'],
		index: number,
		e: React.MouseEvent,
	) => {
		e.preventDefault()
		e.stopPropagation()
		commitEditingText()

		const text = texts[index]
		if (!text) return

		setSelectedTextIndex(index)

		const { x, y } = getScaledPosition(e, visibleCanvasRef.current)

		if (mode === 'move') {
			setTextTransform({
				mode,
				index,
				offsetX: x - text.x,
				offsetY: y - text.y,
			})
			return
		}

		const bounds = getCanvasTextBounds(text.content, text.size)
		const centerX = text.x + bounds.width / 2
		const centerY = text.y + bounds.height / 2

		if (mode === 'scale') {
			setTextTransform({
				mode,
				index,
				centerX,
				centerY,
				startDistance: Math.max(1, Math.hypot(x - centerX, y - centerY)),
				startSize: text.size,
				startWidth: bounds.width,
				startHeight: bounds.height,
			})
			return
		}

		setTextTransform({
			mode,
			index,
			centerX,
			centerY,
			startAngle: (Math.atan2(y - centerY, x - centerX) * 180) / Math.PI,
			startRotation: text.rotation,
		})
	}

	/** 在选区内部按下：整块拖动选区，尺寸不变 */
	const startSelectionMove = useCallback(
		(originX: number, originY: number, bounds: TSelectionBounds) => {
			setSelectionDrag({ mode: 'move', bounds, originX, originY })
		},
		[],
	)

	/** 拖某个手柄：只改对应的边或角 */
	const startSelectionResize = useCallback(
		(handle: TSelectionHandle, e: React.MouseEvent) => {
			/** 只响应左键，右键菜单/中键不参与缩放 */
			if (!selection || e.button !== 0) return

			e.preventDefault()
			e.stopPropagation()

			const { x, y } = getScaledPosition(e, visibleCanvasRef.current)

			setSelectionDrag({
				mode: 'resize',
				handle,
				bounds: getSelectionBounds(selection),
				originX: x,
				originY: y,
			})
		},
		[selection],
	)

	/**
	 * 拖动中的鼠标可能在画布外（工具栏、屏幕边缘）松开，
	 * 所以整个拖动期间把 move / up 挂到 window 上，避免选区卡在跟随状态
	 */
	useEffect(() => {
		if (!selectionDrag) return

		const canvas = visibleCanvasRef.current
		if (!canvas) return

		const canvasSize = { width: canvas.width, height: canvas.height }

		const handleMove = (event: MouseEvent) => {
			/** 在窗口外松开时收不到 mouseup，靠按键状态自愈，否则选区会一直跟着光标跑 */
			if (event.buttons === 0) {
				setSelectionDrag(null)
				return
			}

			const { x, y } = getScaledPosition(event, canvas)
			const dx = x - selectionDrag.originX
			const dy = y - selectionDrag.originY

			if (selectionDrag.mode === 'move') {
				setSelection(
					moveSelection(selectionDrag.bounds, dx, dy, canvasSize),
				)
				return
			}

			setSelection(
				resizeSelection(
					selectionDrag.bounds,
					selectionDrag.handle,
					dx,
					dy,
					canvasSize,
					{ keepRatio: event.shiftKey },
				),
			)
		}

		const handleUp = () => setSelectionDrag(null)

		/**
		 * 拖动期间光标可能离开选区（拖到屏幕边缘），
		 * 临时把整个 body 的光标锁成当前操作的光标，手感更稳
		 */
		const cursor =
			selectionDrag.mode === 'move'
				? 'grabbing'
				: getSelectionHandleCursor(selectionDrag.handle)
		const previousCursor = document.body.style.cursor
		document.body.style.cursor = cursor

		window.addEventListener('mousemove', handleMove)
		window.addEventListener('mouseup', handleUp)

		return () => {
			document.body.style.cursor = previousCursor
			window.removeEventListener('mousemove', handleMove)
			window.removeEventListener('mouseup', handleUp)
		}
	}, [selectionDrag])

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!isSelecting) return

			const { x, y } = getScaledPosition(e, visibleCanvasRef.current)

			if (activeTool === 'text') {
				/** 阻止浏览器把焦点移走，否则输入框会立刻 blur 消失 */
				e.preventDefault()
				commitEditingText()
				setSelectedTextIndex(null)
				setEditingText({ x, y })
				setTextDraft('')
				return
			}

			if (activeTool === 'select') {
				if (showTools) {
					if (!selection) return

					const bounds = getSelectionBounds(selection)
					const inside =
						x >= bounds.left &&
						x <= bounds.left + bounds.width &&
						y >= bounds.top &&
						y <= bounds.top + bounds.height

					/** 选区内部按下：整块拖动选区，尺寸不变 */
					if (inside) {
						e.preventDefault()
						startSelectionMove(x, y, bounds)
						return
					}

					/**
					 * 选区外按下：重新拉一个选区，和常见截屏工具一致。
					 * 旧选区先存起来，如果只是误点（拖动范围不足 10px）
					 * 松手时再还原，不会白白丢掉已经画好的标注。
					 */
					restoreSelectionRef.current = selection
					setShowTools(false)
				}

				setSelection({
					start: { x, y },
					end: { x, y },
				})
			} else if (activeTool === 'draw') {
				setDrawing(true)
				setCurrentPaint({
					kind: 'pen',
					path: [{ x, y }],
					color: drawColor,
					width: drawWidth,
				})
			} else if (activeTool === 'rect') {
				setDrawing(true)
				setCurrentRectangle({
					start: { x, y },
					end: { x, y },
					color: drawColor,
					width: drawWidth,
				})
			} else if (activeTool === 'mosaic') {
				setDrawing(true)
				setCurrentPaint({
					kind: 'mosaic',
					path: [{ x, y }],
					width: mosaicWidth,
				})
			} else if (activeTool === 'eraser') {
				setDrawing(true)
				setCurrentPaint({
					kind: 'eraser',
					path: [{ x, y }],
					width: eraserWidth,
				})
			}
		},
		[
			isSelecting,
			activeTool,
			showTools,
			selection,
			drawColor,
			drawWidth,
			commitEditingText,
			mosaicWidth,
			eraserWidth,
			startSelectionMove,
		],
	)

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!visibleCanvasRef.current) return

			const { x, y } = getScaledPosition(e, visibleCanvasRef.current)

			if (textTransform) {
				setTexts(prev =>
					prev.map((text, index) => {
						if (index !== textTransform.index) return text

						if (textTransform.mode === 'move') {
							return {
								...text,
								x: Math.round(x - textTransform.offsetX),
								y: Math.round(y - textTransform.offsetY),
							}
						}

						if (textTransform.mode === 'scale') {
							const distance = Math.hypot(
								x - textTransform.centerX,
								y - textTransform.centerY,
							)
							const size = Math.min(
								400,
								Math.max(
									8,
									Math.round(
										textTransform.startSize *
											(distance / textTransform.startDistance),
									),
								),
							)
							const ratio = size / textTransform.startSize

							/** 缩放围绕包围盒中心，四角拖动时文字不会跑偏 */
							return {
								...text,
								size,
								x: Math.round(
									textTransform.centerX -
										(textTransform.startWidth * ratio) / 2,
								),
								y: Math.round(
									textTransform.centerY -
										(textTransform.startHeight * ratio) / 2,
								),
							}
						}

						const angle =
							(Math.atan2(
								y - textTransform.centerY,
								x - textTransform.centerX,
							) *
								180) /
							Math.PI
						const rotation =
							textTransform.startRotation +
							(angle - textTransform.startAngle)

						return {
							...text,
							/** 按住 Shift 吸附到 15 度 */
							rotation: e.shiftKey
								? Math.round(rotation / 15) * 15
								: Math.round(rotation),
						}
					}),
				)
				return
			}

			latestMouseInfoRef.current = {
				clientX: e.clientX,
				clientY: e.clientY,
				x,
				y,
			}
			if (mouseInfoFrameRef.current === null) {
				mouseInfoFrameRef.current = requestAnimationFrame(() => {
					setCurrentMouseInfo(latestMouseInfoRef.current)
					mouseInfoFrameRef.current = null
				})
			}

			if (selection && activeTool === 'select' && !showTools) {
				setSelection(prev => ({ ...prev!, end: { x, y } }))
			} else if (
				drawing &&
				currentPaint &&
				(activeTool === 'draw' ||
					activeTool === 'mosaic' ||
					activeTool === 'eraser')
			) {
				setCurrentPaint(prev => {
					if (!prev) return prev

					const last = prev.path[prev.path.length - 1]

					/** 采样去重：太近的点直接丢掉，减少状态更新和每帧重绘量 */
					if (last && Math.hypot(x - last.x, y - last.y) < 1.5) {
						return prev
					}

					return { ...prev, path: [...prev.path, { x, y }] }
				})
			} else if (drawing && currentRectangle && activeTool === 'rect') {
				setCurrentRectangle(prev => ({
					...prev!,
					end: { x, y },
				}))
			}
		},
		[
			selection,
			activeTool,
			drawing,
			currentPaint,
			currentRectangle,
			showTools,
			textTransform,
		],
	)

	const handleMouseUp = useCallback(() => {
		/** 选区已确认后，鼠标抬起只结束拖动/缩放，不再重新判定框选有效性 */
		if (
			isSelecting &&
			selection &&
			activeTool === 'select' &&
			!showTools &&
			!selectionDrag
		) {
			const { start, end } = selection
			const width = Math.abs(end.x - start.x)
			const height = Math.abs(end.y - start.y)

			if (width > 10 && height > 10) {
				restoreSelectionRef.current = null
				setShowTools(true)
			} else if (restoreSelectionRef.current) {
				/** 重新框选的拖动距离太小，判定为误点，还原上一次的选区 */
				setSelection(restoreSelectionRef.current)
				restoreSelectionRef.current = null
				setShowTools(true)
			} else {
				setSelection(null)
			}
		}

		if (
			drawing &&
			currentPaint &&
			(activeTool === 'draw' ||
				activeTool === 'mosaic' ||
				activeTool === 'eraser')
		) {
			setPaints(prev => [...prev, currentPaint])
			setCurrentPaint(null)
		}

		if (drawing && currentRectangle && activeTool === 'rect') {
			setRectangles(prev => [...prev, currentRectangle])
			setCurrentRectangle(null)
		}

		setDrawing(false)
		setTextTransform(null)
	}, [
		isSelecting,
		selection,
		activeTool,
		drawing,
		currentPaint,
		currentRectangle,
		showTools,
		selectionDrag,
	])

	const completeSelection = useCallback(
		async (isHoverCapture: boolean = false) => {
			const canvas = visibleCanvasRef.current

			if (!selection || !canvas || !backgroundImage || !source) return

			const { start, end } = selection
			const x = Math.round(Math.min(start.x, end.x))
			const y = Math.round(Math.min(start.y, end.y))
			const width = Math.round(Math.abs(end.x - start.x))
			const height = Math.round(Math.abs(end.y - start.y))

			/** 输入框里尚未提交的内容也要算进导出结果 */
			const draft = textDraft.replace(/\s+$/, '')
			const finalTexts =
				editingText && draft
					? [
							...texts,
							{
								...editingText,
								content: draft,
								color: drawColor,
								size: Math.round(fontSize * source.scaleFactor),
								rotation: 0,
							},
						]
					: texts

			/**
			 * 同步重画最终一帧，避免最后一笔还没等 React 重绘就丢了
			 */
			drawCanvasImage(
				canvas,
				backgroundImage,
				rectangles,
				selection,
				null,
				paints,
				currentPaint,
				finalTexts,
			)

			const params = {
				id: uuidv4(),
				source: await cropCanvasToPngBytes(canvas, {
					x,
					y,
					width,
					height,
				}),
				size: {
					width: width / source.scaleFactor,
					height: height / source.scaleFactor,
				},
				position: {
					x: x / source.scaleFactor,
					y: y / source.scaleFactor,
				},
				pixelBounds: {
					x,
					y,
					width,
					height,
				},
			}

			if (isHoverCapture) {
				sendCaptureHover(params)
			} else {
				sendCaptureSave(params)
			}
		},
		[
			selection,
			source,
			backgroundImage,
			rectangles,
			paints,
			currentPaint,
			texts,
			editingText,
			textDraft,
			drawColor,
			fontSize,
		],
	)

	const finishCapture = useCallback(
		async (isHoverCapture: boolean) => {
			if (!selection) return

			try {
				await completeSelection(isHoverCapture)
				sendRouterClose('capturer')
			} catch (error) {
				/** 导出失败时保留遮罩，让用户能重试或手动取消 */
				console.error('导出选区失败:', error)
			}
		},
		[selection, completeSelection],
	)

	const saveScreenshot = useCallback(
		() => finishCapture(false),
		[finishCapture],
	)

	const hoverScreenshot = useCallback(
		() => finishCapture(true),
		[finishCapture],
	)

	const cancelScreenshot = useCallback(() => {
		setSelection(null)
		setShowTools(false)
		startRegionSelection()
	}, [startRegionSelection])

	const drawCanvas = useCallback(() => {
		if (!visibleCanvasRef.current || !source || !backgroundImage) return

		const canvas = visibleCanvasRef.current
		drawCanvasImage(
			canvas,
			backgroundImage,
			rectangles,
			selection,
			currentRectangle,
			paints,
			currentPaint,
			texts,
		)
	}, [
		source,
		selection,
		rectangles,
		currentRectangle,
		paints,
		currentPaint,
		backgroundImage,
		texts,
	])

	useEffect(() => {
		if (drawFrameRef.current !== null) {
			cancelAnimationFrame(drawFrameRef.current)
		}
		drawFrameRef.current = requestAnimationFrame(() => {
			drawCanvas()
			drawFrameRef.current = null
		})

		return () => {
			if (drawFrameRef.current !== null) {
				cancelAnimationFrame(drawFrameRef.current)
				drawFrameRef.current = null
			}
		}
	}, [drawCanvas])

	useEffect(() => {
		return () => {
			if (mouseInfoFrameRef.current !== null) {
				cancelAnimationFrame(mouseInfoFrameRef.current)
			}
			if (drawFrameRef.current !== null) {
				cancelAnimationFrame(drawFrameRef.current)
			}
		}
	}, [])

	// 处理ESC键关闭
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setTextTransform(null)
				setSelectedTextIndex(null)

				/** 正在拖动选区时，Esc 只撤销这次拖动，选区回到按下前的样子 */
				if (selectionDrag) {
					setSelection(selectionFromBounds(selectionDrag.bounds))
					setSelectionDrag(null)
					return
				}

				if (editingText) {
					setEditingText(null)
					setTextDraft('')
				} else if (showTools) {
					setSelection(null)
					setPaints([])
					setCurrentPaint(null)
					setRectangles([])
					setTexts([])
					setShowTools(false)
					setActiveTool('select')
				} else if (selection) {
					setSelection(null)
				} else {
					setActiveTool('select')
					setSource(undefined)
					setPaints([])
					setCurrentPaint(null)
					setRectangles([])
					setCurrentRectangle(null)
					setTexts([])
					ipc.send('CAPTURE_LOG', 'CAPTURE_WINDOWS_CLOSE')
					sendRouterClose('capturer')
				}
			} else if (event.key === 'Enter') {
				/** 输入框内的 Enter 由组件自己处理并阻止冒泡 */
				if (!editingText && selection) {
					void saveScreenshot()
				}
			} else if (
				(event.key === 'Delete' || event.key === 'Backspace') &&
				!editingText &&
				selectedTextIndex !== null
			) {
				/** 选中某条文字后按删除键，整条移除 */
				event.preventDefault()
				setTexts(prev =>
					prev.filter((_, index) => index !== selectedTextIndex),
				)
				setSelectedTextIndex(null)
				setTextTransform(null)
			} else if (
				(event.key === 'ArrowUp' ||
					event.key === 'ArrowDown' ||
					event.key === 'ArrowLeft' ||
					event.key === 'ArrowRight') &&
				!editingText &&
				showTools &&
				selection &&
				activeTool === 'select'
			) {
				/**
				 * 方向键微调选区位置：按住 Shift 每次 10px，否则 1px。
				 * 步长按画布设备像素取整后至少 1px，1x 屏上不会被取整成 0。
				 */
				event.preventDefault()

				const canvas = visibleCanvasRef.current
				if (!canvas) return

				const factor = source?.scaleFactor ?? 1
				const step = Math.max(1, Math.round((event.shiftKey ? 10 : 1) * factor))
				const dx =
					event.key === 'ArrowLeft'
						? -step
						: event.key === 'ArrowRight'
							? step
							: 0
				const dy =
					event.key === 'ArrowUp'
						? -step
						: event.key === 'ArrowDown'
							? step
							: 0

				setSelection(
					moveSelection(
						getSelectionBounds(selection),
						dx,
						dy,
						{ width: canvas.width, height: canvas.height },
					),
				)
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [
		selection,
		showTools,
		saveScreenshot,
		editingText,
		selectedTextIndex,
		activeTool,
		source,
		selectionDrag,
	])

	/**
	 * 输入框按内容自适应，否则会把整行都盖住，挡住画布上已提交文字的点击
	 */
	const editingBox = editingText ? measureTextSize(textDraft, fontSize) : null

	/** 画笔类工具（涂鸦 / 马赛克 / 橡皮擦）用圆圈光标，直径等于笔刷粗细 */
	const isBrushTool =
		activeTool === 'draw' ||
		activeTool === 'mosaic' ||
		activeTool === 'eraser'
	const brushWidth =
		activeTool === 'mosaic'
			? mosaicWidth
			: activeTool === 'eraser'
				? eraserWidth
				: drawWidth

	/** 有选区之后，取色模块只在选区内部显示 */
	const selectionBounds = selection
		? {
				left: Math.min(selection.start.x, selection.end.x),
				right: Math.max(selection.start.x, selection.end.x),
				top: Math.min(selection.start.y, selection.end.y),
				bottom: Math.max(selection.start.y, selection.end.y),
			}
		: null
	const cursorInsideSelection =
		!selectionBounds ||
		(currentMouseInfo !== undefined &&
			currentMouseInfo.x >= selectionBounds.left &&
			currentMouseInfo.x <= selectionBounds.right &&
			currentMouseInfo.y >= selectionBounds.top &&
			currentMouseInfo.y <= selectionBounds.bottom)

	/** 选区已确认且鼠标停在选区内：光标提示「可以整块拖动」 */
	const canDragSelection =
		activeTool === 'select' && showTools && !!cursorInsideSelection

	/** 拖动选区 / 手柄期间，整个画布保持当前操作的光标，拖出选区也不会跳回箭头 */
	const dragCursor = selectionDrag
		? selectionDrag.mode === 'move'
			? 'grabbing'
			: getSelectionHandleCursor(selectionDrag.handle)
		: null

	const selectionCursor = dragCursor
		? dragCursor
		: !showTools
			? 'crosshair'
			: canDragSelection
				? 'move'
				: 'default'

	const canvasCursor = isBrushTool
		? 'none'
		: activeTool === 'text'
			? 'text'
			: selectionCursor

	return (
		<div
			ref={containerRef}
			className="relative w-screen h-screen overflow-hidden bg-transparent"
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
		>
			{source && (
				<div className="relative">
					<canvas
						ref={visibleCanvasRef}
						className="block"
						onMouseDown={handleMouseDown}
						onMouseEnter={() => setIsHoveringCanvas(true)}
						onMouseLeave={() => setIsHoveringCanvas(false)}
						draggable={false}
						style={{
							cursor: canvasCursor,
						}}
					/>
					{activeTool === 'text' &&
						texts.map((text, index) => {
							const box = getCanvasTextBounds(
								text.content,
								text.size / source.scaleFactor,
							)
							const boxWidth =
								Math.ceil(box.width) + CAPTURER_TEXT_BOX_PADDING * 2
							const boxHeight =
								Math.ceil(box.height) + CAPTURER_TEXT_BOX_PADDING * 2

							return (
								<div
									key={index}
									onMouseDown={e =>
										startTextTransform('move', index, e)
									}
									title="拖动移动，拖四角缩放，拖顶部圆点旋转，Delete 删除"
									className={`absolute z-[55] cursor-move border ${
										selectedTextIndex === index
											? 'border-solid border-[#1E90FF]'
											: 'border-dashed border-white/70'
									}`}
									style={{
										left:
											text.x / source.scaleFactor -
											CAPTURER_TEXT_BOX_PADDING,
										top:
											text.y / source.scaleFactor -
											CAPTURER_TEXT_BOX_PADDING,
										width: boxWidth,
										height: boxHeight,
										transform: `rotate(${text.rotation || 0}deg)`,
									}}
								>
									{TEXT_SCALE_HANDLES.map(handle => (
										<div
											key={handle.position}
											onMouseDown={e =>
												startTextTransform('scale', index, e)
											}
											className={`absolute w-2 h-2 bg-white border border-[#1E90FF] ${handle.position}`}
											style={{ cursor: handle.cursor }}
										/>
									))}
									<div className="absolute left-1/2 -top-3 w-px h-3 bg-white/70 -translate-x-1/2 pointer-events-none" />
									<div
										onMouseDown={e =>
											startTextTransform('rotate', index, e)
										}
										title="旋转（按住 Shift 吸附 15°）"
										className="absolute left-1/2 -top-6 -translate-x-1/2 w-3 h-3 rounded-full bg-white border border-[#1E90FF] cursor-grab"
									/>
								</div>
							)
						})}
					{editingText && source && (
						<textarea
							ref={textInputRef}
							autoFocus
							spellCheck={false}
							wrap="off"
							value={textDraft}
							onChange={e => setTextDraft(e.target.value)}
							onBlur={commitEditingText}
							onMouseDown={e => e.stopPropagation()}
							onKeyDown={handleTextKeyDown}
							className="absolute z-[60] m-0 p-0 outline-none resize-none overflow-hidden whitespace-pre"
							style={{
								left: editingText.x / source.scaleFactor,
								top: editingText.y / source.scaleFactor,
								width: Math.ceil(editingBox?.width ?? 0) + 4,
								height: Math.ceil(editingBox?.height ?? 0) + 2,
								color: drawColor,
								caretColor: drawColor,
								fontSize,
								fontFamily: CAPTURER_TEXT_FONT_FAMILY,
								lineHeight: CAPTURER_TEXT_LINE_HEIGHT,
								background: 'rgba(0, 0, 0, 0.25)',
								boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.6)',
							}}
						/>
					)}
					{isSelecting && selection && (
						<>
							<SelectionBorder
								selection={selection}
								showTools={showTools}
								canvas={visibleCanvasRef?.current}
								scaleFactor={source.scaleFactor}
								interactive={activeTool === 'select'}
								onResizeStart={startSelectionResize}
							/>
							<SelectionSize
								selection={selection}
								containerRect={containerRect}
								source={source}
							/>
						</>
					)}
				</div>
			)}

			{/* 选中加工工具时不显示；有选区后只在选区内显示 */}
			{activeTool === 'select' && cursorInsideSelection && (
				<PixelColor
					currentMouseInfo={currentMouseInfo}
					visibleCanvasRef={visibleCanvasRef.current}
				/>
			)}

			{/* 画笔类工具的圆圈光标，直径就是笔刷粗细 */}
			{isBrushTool && isHoveringCanvas && currentMouseInfo && source && (
				<div
					className="pointer-events-none fixed z-[54] rounded-full"
					style={{
						left: currentMouseInfo.clientX,
						top: currentMouseInfo.clientY,
						width: brushWidth / source.scaleFactor,
						height: brushWidth / source.scaleFactor,
						transform: 'translate(-50%, -50%)',
						border: '1px solid rgba(255, 255, 255, 0.9)',
						boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.55)',
						backgroundColor:
							activeTool === 'eraser'
								? 'rgba(255, 255, 255, 0.18)'
								: 'transparent',
					}}
				/>
			)}

			<ToolBar
				containerRect={containerRect}
				selection={selection}
				activeState={activeTool}
				drawColor={drawColor}
				drawWidth={drawWidth}
				fontSize={fontSize}
				mosaicWidth={mosaicWidth}
				eraserWidth={eraserWidth}
				onMosaicWidthChange={setMosaicWidth}
				onEraserWidthChange={setEraserWidth}
				onColorChange={setDrawColor}
				onFontSizeChange={setFontSize}
				onWidthChange={setDrawWidth}
				source={source}
				interactive={!selectionDrag}
				visible={!selectionDrag}
				onTriggerEvent={status => {
					switch (status) {
						case 'RESET':
							setActiveTool('select')
							setShowTools(false)
							break
						case 'SELECT':
							setActiveTool('select')
							break
						case 'DRAW':
							toggleTool('draw')
							break
						case 'RECT':
							toggleTool('rect')
							break
						case 'TEXT':
							toggleTool('text')
							break
						case 'MOSAIC':
							toggleTool('mosaic')
							break
						case 'ERASER':
							toggleTool('eraser')
							break
						case 'CLEAR_DRAW':
							setPaints([])
							setCurrentPaint(null)
							setRectangles([])
							setCurrentRectangle(null)
							setTexts([])
							setEditingText(null)
							setTextDraft('')
							setTextTransform(null)
							setSelectedTextIndex(null)
							break
						case 'CANCEL':
							cancelScreenshot()
							setActiveTool('select')
							break
						case 'SAVE':
							saveScreenshot()
							break
						case 'HOVER':
							hoverScreenshot()
					}
				}}
				show={!!(showTools && selection)}
			/>
		</div>
	)
}
