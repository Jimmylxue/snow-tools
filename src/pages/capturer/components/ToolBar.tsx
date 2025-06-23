import { useEffect, useState, useRef } from 'react'
import { SelectionRect, TAbsolutePosition } from '../type'
import { TCapturerMessage } from '..'

type TProps = {
	activeState: string
	onTriggerEvent: (
		event: 'RESET' | 'SELECT' | 'DRAW' | 'CLEAR_DRAW' | 'CANCEL' | 'SAVE'
	) => void
	show: boolean
	selection: SelectionRect | null
	containerRect?: DOMRect
	drawColor: string
	onColorChange: (color: string) => void
	drawWidth: number
	onWidthChange: (width: number) => void
	source?: TCapturerMessage
}

export function ToolBar({
	activeState,
	onTriggerEvent,
	show,
	selection,
	containerRect,
	drawColor,
	onColorChange,
	drawWidth,
	onWidthChange,
	source,
}: TProps) {
	const [position, setPosition] = useState<TAbsolutePosition>()
	const [showColorPicker, setShowColorPicker] = useState(false)
	const [showWidthSlider, setShowWidthSlider] = useState(false)
	const toolbarRef = useRef<HTMLDivElement>(null)

	const [toolbarSize, setToolbarSize] = useState({
		width: 0,
		height: 0,
	})
	const margin = 8

	// uTools风格的颜色选项
	const colorOptions = [
		'#FF5F56',
		'#FFBD2E',
		'#27C93F',
		'#1E90FF',
		'#8957E5',
		'#FF78CB',
		'#000000',
		'#9E9E9E',
	]

	// 动态计算工具栏尺寸
	useEffect(() => {
		if (toolbarRef.current && show) {
			const { width, height } = toolbarRef.current.getBoundingClientRect()
			setToolbarSize({
				width: Math.ceil(width),
				height: Math.ceil(height),
			})
		}
	}, [show, showColorPicker, showWidthSlider])

	// 定位计算
	useEffect(() => {
		if (selection && containerRect && toolbarSize.width > 0 && source) {
			const { start, end } = selection
			const selectionBottom = Math.max(
				start.y / source.scaleFactor,
				end.y / source.scaleFactor
			)
			const selectionTop = Math.min(
				start.y / source.scaleFactor,
				end.y / source.scaleFactor
			)

			// 计算可用空间
			const spaceBelow = containerRect.height - selectionBottom - margin
			const spaceAbove = selectionTop - margin

			// 决定显示位置（优先下方，然后上方，最后选区内部）
			let top: number
			let left = start.x / source.scaleFactor

			if (spaceBelow >= toolbarSize.height) {
				top = selectionBottom + margin // 下方
			} else if (spaceAbove >= toolbarSize.height) {
				top = selectionTop - toolbarSize.height - margin // 上方
			} else {
				top = selectionTop + margin // 选区内部
			}

			// 水平位置调整（确保不超出容器）
			const maxLeft = containerRect.width - toolbarSize.width
			if (left > maxLeft) {
				left = maxLeft
			} else if (left < 0) {
				left = 0
			}

			setPosition({ top, left })
		}
	}, [selection, containerRect, toolbarSize, source])

	return (
		<div
			ref={toolbarRef}
			className={`fixed flex items-center bg-[#2C2C2C] p-2 rounded-lg shadow-xl z-50 border border-[#3D3D3D] transition-all
        ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
			style={{
				left: `${position?.left ?? -9999}px`,
				top: `${position?.top ?? -9999}px`,
				// 使用内联样式确保初始渲染时有正确尺寸
				visibility: show ? 'visible' : 'hidden',
			}}
		>
			{/* 基本工具按钮 */}
			<div className="flex items-center space-x-2">
				<button
					className={`px-3 h-9 rounded-md text-sm font-medium transition-all
            ${
							activeState === 'draw'
								? 'bg-[#1E90FF] text-white'
								: 'bg-[#3A3A3A] text-[#D8D8D8] hover:bg-[#454545]'
						}`}
					onClick={() => onTriggerEvent('DRAW')}
				>
					涂鸦
				</button>

				{/* 分隔线 */}
				<div className="h-6 w-px bg-[#3D3D3D] mx-1"></div>
			</div>

			{/* 颜色选择器 */}
			<div className="relative mx-2">
				<button
					className="w-8 h-8 rounded-md border border-[#4A4A4A] shadow-inner flex items-center justify-center"
					style={{ backgroundColor: drawColor }}
					onClick={() => {
						setShowColorPicker(true)
						setShowWidthSlider(false)
					}}
					title="选择颜色"
				>
					<div
						className="w-5 h-5 rounded-sm"
						style={{ backgroundColor: drawColor }}
					/>
				</button>
				{showColorPicker && (
					<div
						className="absolute left-0 top-10 bg-[#383838] p-3 rounded-lg shadow-xl z-50 w-48 border border-[#4A4A4A]"
						onMouseLeave={() => setShowColorPicker(false)}
					>
						<div className="grid grid-cols-6 gap-2 mb-3">
							{colorOptions.map(color => (
								<button
									key={color}
									className="w-6 h-6 rounded-sm border border-transparent hover:border-white transition"
									style={{ backgroundColor: color }}
									onClick={() => {
										onColorChange(color)
										setShowColorPicker(false)
									}}
									title={color}
								/>
							))}
						</div>
						<input
							type="color"
							className="w-full h-8 cursor-pointer rounded bg-transparent"
							value={drawColor}
							onChange={e => onColorChange(e.target.value)}
						/>
					</div>
				)}
			</div>

			{/* 画笔宽度调节器 */}
			<div className="relative flex items-center mx-2">
				<button
					className="px-3 h-9 rounded-md text-sm font-medium bg-[#3A3A3A] text-[#D8D8D8] hover:bg-[#454545] transition-all flex items-center"
					onClick={() => {
						setShowWidthSlider(true)
						setShowColorPicker(false)
					}}
				>
					<div
						className="w-4 h-4 mr-3 bg-current rounded-full"
						style={{
							transform: `scale(${drawWidth / 10})`,
							opacity: 0.8,
						}}
					/>
					{drawWidth}px
				</button>
				{showWidthSlider && (
					<div
						className="absolute left-0 top-10 bg-[#383838] p-3 rounded-lg shadow-xl z-50 w-48 border border-[#4A4A4A]"
						onMouseLeave={() => setShowWidthSlider(false)}
					>
						<div className="flex items-center mb-2">
							<span className="text-xs text-[#B0B0B0] mr-2">粗细:</span>
							<span className="text-sm text-white">{drawWidth}px</span>
						</div>
						<input
							type="range"
							min="1"
							max="20"
							value={drawWidth}
							onChange={e => onWidthChange(parseInt(e.target.value))}
							className="w-full h-1 bg-[#4A4A4A] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
						/>
						<div className="flex justify-between text-xs text-[#B0B0B0] mt-1">
							<span>1</span>
							<span>20</span>
						</div>
					</div>
				)}
			</div>

			{/* 分隔线 */}
			<div className="h-6 w-px bg-[#3D3D3D] mx-1"></div>

			{/* 功能按钮 */}
			<button
				className="px-3 h-9 rounded-md text-sm font-medium bg-[#3A3A3A] text-[#D8D8D8] hover:bg-[#454545] transition-all mx-1"
				onClick={() => onTriggerEvent('CLEAR_DRAW')}
			>
				清除
			</button>

			<div className="flex-grow"></div>

			{/* 操作按钮 */}
			<div className="flex items-center space-x-2 ml-2">
				<button
					className="px-4 h-9 rounded-md text-sm font-medium bg-[#FF5F56] text-white hover:bg-[#FF3B30] transition-all"
					onClick={() => onTriggerEvent('CANCEL')}
				>
					取消
				</button>
				<button
					className="px-4 h-9 rounded-md text-sm font-medium bg-[#27C93F] text-white hover:bg-[#1DAD32] transition-all"
					onClick={() => onTriggerEvent('SAVE')}
				>
					保存
				</button>
			</div>
		</div>
	)
}
