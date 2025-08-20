import { useEffect, useState, useRef, useCallback } from 'react'
import {
	sendCaptureHover,
	sendCaptureSave,
	sendRouterClose,
} from '@/hooks/ipc/window'
import { ToolBar } from './components/ToolBar'
import { PixelColor } from './components/PixelColor'
import { Position, SelectionRect, TCurrentMouseInfo, Tool } from './type'
import { SelectionBorder } from './components/SelectionBorder'
import {
	capturerCloseObserve,
	capturerObserve,
	TCapturerMessage,
} from './oberver'
import { v4 as uuidv4 } from 'uuid'
import { getIpc } from '@/hooks/ipc'
import { SelectionSize } from './components/SelectionSize'
import { drawCanvasImage } from './utils/canvas'
import { getScaledPosition } from './utils/utils'

const ipc = getIpc()

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

	const visibleCanvasRef = useRef<HTMLCanvasElement>(null)

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
			setDrawings([])
			setCurrentDrawing(null)
			setRectangles([])
			setCurrentRectangle(null)
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

		const img = new Image()
		img.onload = () => {
			setBackgroundImage(img)
			const visibleCanvas = visibleCanvasRef.current!
			visibleCanvas.width = img.naturalWidth
			visibleCanvas.height = img.naturalHeight
			visibleCanvas.style.width = `${img.naturalWidth / source.scaleFactor}px`
			visibleCanvas.style.height = `${img.naturalHeight / source.scaleFactor}px`
			const visibleCtx = visibleCanvas.getContext('2d')!
			visibleCtx.drawImage(img, 0, 0)
			ipc.send('SHOW_CAPTURER_SCREEN')
			startRegionSelection()
		}
		img.src = source.source
	}, [source, startRegionSelection])

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!isSelecting) return

			const { x, y } = getScaledPosition(e, visibleCanvasRef.current)

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
		[isSelecting, activeTool, showTools, drawColor, drawWidth]
	)

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!visibleCanvasRef.current) return

			const { x, y } = getScaledPosition(e, visibleCanvasRef.current)
			setCurrentMouseInfo({ e, x, y })

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
		]
	)

	const handleMouseUp = useCallback(() => {
		if (isSelecting && selection && activeTool === 'select') {
			const { start, end } = selection
			const width = Math.abs(end.x - start.x)
			const height = Math.abs(end.y - start.y)

			if (width > 10 && height > 10) {
				setShowTools(true)
				setActiveTool('rect')
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
	}, [
		isSelecting,
		selection,
		activeTool,
		drawing,
		currentDrawing,
		currentRectangle,
	])

	const completeSelection = useCallback(
		(isHoverCapture: boolean = false) => {
			if (!selection || !visibleCanvasRef.current) return

			const canvas = visibleCanvasRef.current
			const outputCanvas = document.createElement('canvas')
			const ctx = outputCanvas.getContext('2d', { willReadFrequently: true })!
			ctx.imageSmoothingEnabled = false

			const { start, end } = selection
			const x = Math.round(Math.min(start.x, end.x))
			const y = Math.round(Math.min(start.y, end.y))
			const width = Math.round(Math.abs(end.x - start.x))
			const height = Math.round(Math.abs(end.y - start.y))

			outputCanvas.width = width
			outputCanvas.height = height

			ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height)

			const imageDataUrl = outputCanvas.toDataURL('image/png', 1.0)

			const params = {
				id: uuidv4(),
				source: imageDataUrl,
				size: {
					width: width / source!.scaleFactor,
					height: height / source!.scaleFactor,
				},
				position: {
					x: x / source!.scaleFactor,
					y: y / source!.scaleFactor,
				},
			}

			if (isHoverCapture) {
				sendCaptureHover(params)
			} else {
				sendCaptureSave(params)
			}
		},
		[selection, source]
	)

	const saveScreenshot = useCallback(() => {
		if (!selection) return
		completeSelection()
		sendRouterClose('capturer')
	}, [selection, completeSelection])

	const hoverScreenshot = useCallback(() => {
		if (!selection) return
		completeSelection(true)
		sendRouterClose('capturer')
	}, [selection, completeSelection])

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
			currentDrawing
		)
	}, [
		source,
		selection,
		rectangles,
		currentRectangle,
		drawings,
		currentDrawing,
		backgroundImage,
	])

	useEffect(() => {
		drawCanvas()
	}, [drawCanvas])

	// 处理ESC键关闭
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				if (showTools) {
					setSelection(null)
					setDrawings([])
					setRectangles([])
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
					ipc.send('CAPTURE_LOG', 'CAPTURE_WINDOWS_CLOSE')
					sendRouterClose('capturer')
				}
			} else if (event.key === 'Enter') {
				if (selection) {
					saveScreenshot()
				}
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [selection, showTools, saveScreenshot])

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
							cursor: !showTools ? 'crosshair' : 'default',
						}}
					/>
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

			<PixelColor
				currentMouseInfo={currentMouseInfo}
				visibleCanvasRef={visibleCanvasRef.current}
			/>

			<ToolBar
				containerRect={containerRect}
				selection={selection}
				activeState={activeTool}
				drawColor={drawColor}
				drawWidth={drawWidth}
				onColorChange={setDrawColor}
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
							setActiveTool('draw')
							break
						case 'RECT':
							setActiveTool('rect')
							break
						case 'CLEAR_DRAW':
							setDrawings([])
							setCurrentDrawing(null)
							setRectangles([])
							setCurrentRectangle(null)
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
