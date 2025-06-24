import { useCallback, useEffect, useState } from 'react'
import { TAbsolutePosition, TCurrentMouseInfo } from '../type'
import { capturerCloseObserve } from '../oberver'

type TProps = {
	currentMouseInfo?: TCurrentMouseInfo
	visibleCanvasRef: HTMLCanvasElement | null
}

export function PixelColor({ currentMouseInfo, visibleCanvasRef }: TProps) {
	const [infoBoxPosition, setInfoBoxPosition] = useState<TAbsolutePosition>()
	const [pixelColor, setPixelColor] = useState<string>()
	const [zoomArea, setZoomArea] = useState<string>('')
	const [colorFormat, setColorFormat] = useState<'rgb' | 'hex'>('rgb')
	const [showHint, setShowHint] = useState(false)

	// 转换颜色格式
	const formatColor = useCallback(
		(color: string) => {
			if (!color) return ''

			if (colorFormat === 'hex' && color.startsWith('rgb(')) {
				const rgb = color.match(/\d+/g)
				if (rgb && rgb.length === 3) {
					return `#${parseInt(rgb[0]).toString(16).padStart(2, '0')}${parseInt(
						rgb[1]
					)
						.toString(16)
						.padStart(2, '0')}${parseInt(rgb[2]).toString(16).padStart(2, '0')}`
				}
			}
			return color
		},
		[colorFormat]
	)

	// 复制颜色到剪贴板
	const copyColor = useCallback(() => {
		if (!pixelColor) return

		const formattedColor = formatColor(pixelColor)
		navigator.clipboard.writeText(formattedColor)

		setShowHint(true)

		setTimeout(() => {
			setShowHint(false)
		}, 2000)
	}, [pixelColor, formatColor])

	useEffect(() => {
		return () => {
			setShowHint(false)
			setPixelColor(undefined)
			setInfoBoxPosition(undefined)
		}
	}, [])

	// 创建放大区域
	const createZoomArea = useCallback(
		(x: number, y: number, ctx: CanvasRenderingContext2D) => {
			const zoomSize = 100
			const zoomFactor = 5
			const zoomX = Math.max(0, x - zoomSize / (2 * zoomFactor))
			const zoomY = Math.max(0, y - zoomSize / (2 * zoomFactor))

			ctx.getImageData(
				zoomX,
				zoomY,
				zoomSize / zoomFactor,
				zoomSize / zoomFactor
			)

			const zoomCanvas = document.createElement('canvas')
			zoomCanvas.width = zoomSize
			zoomCanvas.height = zoomSize
			const zoomCtx = zoomCanvas.getContext('2d')!

			zoomCtx.imageSmoothingEnabled = false
			zoomCtx.drawImage(
				ctx.canvas,
				zoomX,
				zoomY,
				zoomSize / zoomFactor,
				zoomSize / zoomFactor,
				0,
				0,
				zoomSize,
				zoomSize
			)

			zoomCtx.strokeStyle = 'red'
			zoomCtx.lineWidth = 1
			zoomCtx.beginPath()
			zoomCtx.moveTo(zoomSize / 2, 0)
			zoomCtx.lineTo(zoomSize / 2, zoomSize)
			zoomCtx.moveTo(0, zoomSize / 2)
			zoomCtx.lineTo(zoomSize, zoomSize / 2)
			zoomCtx.stroke()

			setZoomArea(zoomCanvas.toDataURL())
		},
		[]
	)

	// 处理键盘事件
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === 'c' && pixelColor) {
				copyColor()
			} else if (e.shiftKey && pixelColor) {
				setColorFormat(prev => (prev === 'rgb' ? 'hex' : 'rgb'))
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [pixelColor, copyColor])

	// 更新鼠标信息和位置
	useEffect(() => {
		if (currentMouseInfo && visibleCanvasRef) {
			const { e, x, y } = currentMouseInfo
			const canvas = visibleCanvasRef
			const offset = 15
			const infoBoxWidth = 190
			const infoBoxHeight = zoomArea ? 200 : 60

			// 计算可用空间
			const spaceRight = window.innerWidth - e.clientX
			const spaceBottom = window.innerHeight - e.clientY

			// 确定信息框位置
			let left = e.clientX + offset
			let top = e.clientY + offset

			// 如果右侧空间不足，向左显示
			if (spaceRight < infoBoxWidth) {
				left = e.clientX - offset - infoBoxWidth
			}

			// 如果底部空间不足，向上显示
			if (spaceBottom < infoBoxHeight) {
				top = e.clientY - offset - infoBoxHeight
			}

			// 确保不会超出屏幕左侧和顶部
			left = Math.max(10, left)
			top = Math.max(10, top)

			setInfoBoxPosition({ left, top })

			// 获取像素颜色和创建放大区域
			const ctx = canvas.getContext('2d')
			if (ctx) {
				const pixel = ctx.getImageData(x, y, 1, 1).data
				setPixelColor(`rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`)
				createZoomArea(x, y, ctx)
			}
		}
	}, [currentMouseInfo, visibleCanvasRef, createZoomArea, zoomArea])

	useEffect(() => {
		return capturerCloseObserve.subscribe(() => {
			setShowHint(false)
			setPixelColor(undefined)
			setInfoBoxPosition(undefined)
		})
	}, [])

	return (
		pixelColor &&
		infoBoxPosition && (
			<div
				className="fixed flex flex-col p-3 bg-[#2C2C2C] rounded-lg shadow-2xl z-50 border border-gray-700 backdrop-blur-sm bg-opacity-90 w-[200px]"
				style={{
					left: `${infoBoxPosition.left}px`,
					top: `${infoBoxPosition.top}px`,
				}}
			>
				{/* 颜色预览和颜色值 */}
				<div className="flex items-center mb-3">
					<div
						className="w-5 h-5 rounded mr-3 border border-gray-600 flex-shrink-0"
						style={{ backgroundColor: pixelColor }}
					/>
					<div className="font-mono text-xs font-medium text-gray-100">
						{formatColor(pixelColor).toUpperCase()}
					</div>
				</div>

				{/* 操作提示 */}
				<div className="text-xs text-gray-400 mb-2">
					<div>
						Press <kbd className="px-1 bg-gray-700 rounded">Shift</kbd> to
						toggle format
					</div>
					<div>
						Press <kbd className="px-1 bg-gray-700 rounded">C</kbd> to copy
					</div>
				</div>

				{/* 复制成功提示 */}
				{showHint && (
					<div className="absolute -top-8 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded animate-fade-in-out">
						Copied to clipboard!
					</div>
				)}

				{/* 放大区域 */}
				{zoomArea && (
					<div className="relative">
						{/* 十字准星效果 */}
						<div
							className="absolute inset-0 border-2 border-blue-400 pointer-events-none"
							style={{
								width: '100%',
								height: '100%',
								boxSizing: 'border-box',
							}}
						/>
						<div className="absolute top-1/2 left-0 right-0 h-px bg-blue-400 opacity-50 transform -translate-y-1/2"></div>
						<div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-400 opacity-50 transform -translate-x-1/2"></div>

						<img
							src={zoomArea}
							alt="放大区域"
							className="w-full h-auto rounded border border-gray-700"
						/>
					</div>
				)}
			</div>
		)
	)
}
