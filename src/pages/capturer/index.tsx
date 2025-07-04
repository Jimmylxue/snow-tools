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

const ipc = getIpc()

export function Capturer() {
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
	const [drawColor, setDrawColor] = useState('#ff0000')
	const [drawWidth, setDrawWidth] = useState(3)

	const visibleCanvasRef = useRef<HTMLCanvasElement>(null)

	const containerRef = useRef<HTMLDivElement>(null)
	const containerRect = containerRef?.current?.getBoundingClientRect()

	// 处理截屏通知
	useEffect(() => {
		return capturerObserve.subscribe(content => {
			ipc.send('CAPTURE_LOG', 'USE EFFECT GET TRIGGER')
			setSource(content)
		})
	}, [capturerObserve])

	useEffect(() => {
		return capturerCloseObserve.subscribe(() => {
			setActiveTool('select')
			setSource(undefined)
			setDrawings([])
			setCurrentDrawing(null)
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

	const getScaledPosition = useCallback((e: React.MouseEvent) => {
		if (!visibleCanvasRef.current) return { x: 0, y: 0 }

		const canvas = visibleCanvasRef.current
		const rect = canvas.getBoundingClientRect()
		const scaleX = canvas.width / rect.width
		const scaleY = canvas.height / rect.height

		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		}
	}, [])

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!isSelecting) return

			const { x, y } = getScaledPosition(e)

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
			}
		},
		[
			isSelecting,
			activeTool,
			showTools,
			getScaledPosition,
			drawColor,
			drawWidth,
		]
	)

	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (!visibleCanvasRef.current) return

			const { x, y } = getScaledPosition(e)
			setCurrentMouseInfo({ e, x, y })

			if (selection && activeTool === 'select' && !showTools) {
				setSelection(prev => ({ ...prev!, end: { x, y } }))
			} else if (drawing && currentDrawing && activeTool === 'draw') {
				setCurrentDrawing(prev => ({
					...prev!,
					path: [...prev!.path, { x, y }],
				}))
			}
		},
		[
			selection,
			activeTool,
			drawing,
			currentDrawing,
			showTools,
			getScaledPosition,
		]
	)

	const handleMouseUp = useCallback(() => {
		if (isSelecting && selection && activeTool === 'select') {
			const { start, end } = selection
			const width = Math.abs(end.x - start.x)
			const height = Math.abs(end.y - start.y)

			if (width > 10 && height > 10) {
				setShowTools(true)
				setActiveTool('draw')
			} else {
				setSelection(null)
			}
		}

		if (drawing && currentDrawing && activeTool === 'draw') {
			setDrawings(prev => [...prev, currentDrawing])
			setCurrentDrawing(null)
		}

		setDrawing(false)
	}, [isSelecting, selection, activeTool, drawing, currentDrawing])

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

			// setSource(undefined)
		},
		[selection]
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
			ctx.globalCompositeOperation = 'source-over'
			ctx.strokeStyle = 'red'
			ctx.lineWidth = 2
			ctx.setLineDash([5, 5])
			ctx.strokeRect(x, y, width, height)
			ctx.setLineDash([])

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
	}, [source, selection, drawings, currentDrawing, backgroundImage])

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
					setShowTools(false)
					setActiveTool('select')
				} else if (selection) {
					setSelection(null)
				} else {
					setActiveTool('select')
					setSource(undefined)
					setDrawings([])
					setCurrentDrawing(null)
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
						case 'CLEAR_DRAW':
							setDrawings([])
							setCurrentDrawing(null)
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
