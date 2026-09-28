import { useEffect, useState, useRef, useCallback } from 'react'
import {
	sendCaptureHover,
	sendCaptureSave,
	sendRouterClose,
} from '@/hooks/ipc/window'
import { ToolBar } from './components/ToolBar'
import { PixelColor } from './components/PixelColor'
import { Position, SelectionRect, TCurrentMouseInfo, Tool, TTextAnnotation, TTextTransform } from './type'
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
	const [drawings, setDrawings] = useState<
		Array<{ path: Position[]; color: string; width: number }>
	>([])
	const [currentMouseInfo, setCurrentMouseInfo] = useState<TCurrentMouseInfo>()
	const [backgroundImage, setBackgroundImage] =
		useState<HTMLImageElement | null>(null)
	const [currentDrawing, setCurrentDrawing] = useState<{
		path: Position[]
		color: string
		width: number
	} | null>(null)
	/** 画笔颜色 */
	const [drawColor, setDrawColor] = useState('#ff0000')
	/** 画笔宽度 */
	const [drawWidth, setDrawWidth] = useState(3)
	/** 字号，按用户感知的 CSS 像素计，落到画布时再乘 scaleFactor */
	const [fontSize, setFontSize] = useState(20)
	/** 已提交的文字标注 */
	const [texts, setTexts] = useState<TTextAnnotation[]>([])
	/** 正在输入的文字落点（设备像素），null 表示没有输入框 */
	const [editingText, setEditingText] = useState<Position | null>(null)
	const [textDraft, setTextDraft] = useState('')
	/** 正在对文字做的操作：移动 / 缩放 / 旋转 */
	const [textTransform, setTextTransform] = useState<TTextTransform | null>(
		null,
	)
	const textInputRef = useRef<HTMLTextAreaElement>(null)

	const visibleCanvasRef = useRef<HTMLCanvasElement>(null)
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
			setDrawings([])
			setCurrentDrawing(null)
			setRectangles([])
			setCurrentRectangle(null)
			setTexts([])
			setEditingText(null)
			setTextDraft('')
			setTextTransform(null)
		})
	}, [])

	// 开始区域选择
	const startRegionSelection = useCallback(() => {
		setIsSelecting(true)
		setSelection(null)
		setShowTools(false)
		setDrawings([])
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
	const toggleTool = (tool: 'rect' | 'draw' | 'text') => {
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

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!isSelecting) return

			const { x, y } = getScaledPosition(e, visibleCanvasRef.current)

			if (activeTool === 'text') {
				/** 阻止浏览器把焦点移走，否则输入框会立刻 blur 消失 */
				e.preventDefault()
				commitEditingText()
				setEditingText({ x, y })
				setTextDraft('')
				return
			}

			if (activeTool === 'select') {
				if (showTools) return
				setSelection({
					start: { x, y },
					end: { x, y },
				})
			} else if (activeTool === 'draw') {
				setDrawing(true)
				setCurrentDrawing({
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
			}
		},
		[
			isSelecting,
			activeTool,
			showTools,
			drawColor,
			drawWidth,
			commitEditingText,
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
			} else if (drawing && currentDrawing && activeTool === 'draw') {
				setCurrentDrawing(prev => ({
					...prev!,
					path: [...prev!.path, { x, y }],
				}))
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
			currentDrawing,
			currentRectangle,
			showTools,
			textTransform,
		],
	)

	const handleMouseUp = useCallback(() => {
		if (isSelecting && selection && activeTool === 'select') {
			const { start, end } = selection
			const width = Math.abs(end.x - start.x)
			const height = Math.abs(end.y - start.y)

			if (width > 10 && height > 10) {
				setShowTools(true)
			} else {
				setSelection(null)
			}
		}

		if (drawing && currentDrawing && activeTool === 'draw') {
			setDrawings(prev => [...prev, currentDrawing])
			setCurrentDrawing(null)
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
		currentDrawing,
		currentRectangle,
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
				drawings,
				null,
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
			drawings,
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
			drawings,
			currentDrawing,
			texts,
		)
	}, [
		source,
		selection,
		rectangles,
		currentRectangle,
		drawings,
		currentDrawing,
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
				if (editingText) {
					setEditingText(null)
					setTextDraft('')
				} else if (showTools) {
					setSelection(null)
					setDrawings([])
					setRectangles([])
					setTexts([])
					setShowTools(false)
					setActiveTool('select')
				} else if (selection) {
					setSelection(null)
				} else {
					setActiveTool('select')
					setSource(undefined)
					setDrawings([])
					setCurrentDrawing(null)
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
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [selection, showTools, saveScreenshot, editingText])

	/**
	 * 输入框按内容自适应，否则会把整行都盖住，挡住画布上已提交文字的点击
	 */
	const editingBox = editingText ? measureTextSize(textDraft, fontSize) : null

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
						draggable={false}
						style={{
							cursor:
								activeTool === 'text'
									? 'text'
									: !showTools
										? 'crosshair'
										: 'default',
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
									title="拖动移动，拖四角缩放，拖顶部圆点旋转"
									className="absolute z-[55] cursor-move border border-dashed border-white/70"
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

			<ToolBar
				containerRect={containerRect}
				selection={selection}
				activeState={activeTool}
				drawColor={drawColor}
				drawWidth={drawWidth}
				fontSize={fontSize}
				onColorChange={setDrawColor}
				onFontSizeChange={setFontSize}
				onWidthChange={setDrawWidth}
				source={source}
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
						case 'CLEAR_DRAW':
							setDrawings([])
							setCurrentDrawing(null)
							setRectangles([])
							setCurrentRectangle(null)
							setTexts([])
							setEditingText(null)
							setTextDraft('')
							setTextTransform(null)
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
