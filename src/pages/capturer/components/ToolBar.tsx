import { useEffect, useState, useRef, type ReactNode } from 'react'
import { Check, Pencil, Pin, Square, Trash2, Type, X } from 'lucide-react'
import { SelectionRect, TAbsolutePosition, Tool } from '../type'
import { TCapturerMessage } from '../oberver'

type TProps = {
	activeState: string
	onTriggerEvent: (
		event:
			| 'RESET'
			| 'SELECT'
			| 'DRAW'
			| 'RECT'
			| 'TEXT'
			| 'CLEAR_DRAW'
			| 'CANCEL'
			| 'SAVE'
			| 'HOVER'
	) => void
	show: boolean
	selection: SelectionRect | null
	containerRect?: DOMRect
	drawColor: string
	onColorChange: (color: string) => void
	drawWidth: number
	onWidthChange: (width: number) => void
	fontSize: number
	onFontSizeChange: (size: number) => void
	source?: TCapturerMessage
}

const TOOL_BUTTONS: Array<{
	tool: Tool
	title: string
	event: 'RECT' | 'DRAW' | 'TEXT'
	icon: ReactNode
}> = [
	{ tool: 'rect', title: '框选', event: 'RECT', icon: <Square className="w-4 h-4" /> },
	{ tool: 'draw', title: '涂鸦', event: 'DRAW', icon: <Pencil className="w-4 h-4" /> },
	{ tool: 'text', title: '文字', event: 'TEXT', icon: <Type className="w-4 h-4" /> },
]

// uTools风格的颜色选项
const COLOR_OPTIONS = [
	'#FF5F56',
	'#FFBD2E',
	'#27C93F',
	'#1E90FF',
	'#8957E5',
	'#FF78CB',
	'#000000',
	'#9E9E9E',
]

/** 单个工具按钮占宽 32px + 4px 间距 */
const TOOL_SLOT_WIDTH = 36
const STYLE_PANEL_WIDTH = 176

function ToolButton({
	title,
	active,
	danger,
	warning,
	success,
	onClick,
	children,
}: {
	title: string
	active?: boolean
	danger?: boolean
	warning?: boolean
	success?: boolean
	onClick: () => void
	children: ReactNode
}) {
	const tone = active
		? 'bg-[#1E90FF] text-white'
		: danger
			? 'bg-[#FF5F56] text-white hover:bg-[#FF3B30]'
			: warning
				? 'bg-[#FFA500] text-white hover:bg-[#EE9A00]'
				: success
					? 'bg-[#27C93F] text-white hover:bg-[#1DAD32]'
					: 'bg-[#3A3A3A] text-[#D8D8D8] hover:bg-[#454545]'

	return (
		<button
			title={title}
			aria-label={title}
			onClick={onClick}
			className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center transition-all ${tone}`}
		>
			{children}
		</button>
	)
}

function Separator() {
	return <div className="w-px h-5 shrink-0 bg-[#3D3D3D] mx-1" />
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
	fontSize,
	onFontSizeChange,
	source,
}: TProps) {
	const [position, setPosition] = useState<TAbsolutePosition>()
	const toolbarRef = useRef<HTMLDivElement>(null)

	const [toolbarSize, setToolbarSize] = useState({
		width: 0,
		height: 0,
	})
	const margin = 8

	/** 文字工具下同一个滑杆控制字号 */
	const isTextMode = activeState === 'text'
	const sizeValue = isTextMode ? fontSize : drawWidth
	const sizeRange = isTextMode ? { min: 12, max: 48 } : { min: 1, max: 20 }
	const activeToolIndex = TOOL_BUTTONS.findIndex(
		item => item.tool === activeState,
	)

	// 动态计算工具栏尺寸
	useEffect(() => {
		if (toolbarRef.current && show) {
			const { width, height } = toolbarRef.current.getBoundingClientRect()
			setToolbarSize({
				width: Math.ceil(width),
				height: Math.ceil(height),
			})
		}
	}, [show])

	// 定位计算
	useEffect(() => {
		if (selection && containerRect && toolbarSize.width > 0 && source) {
			const { start, end } = selection
			const selectionBottom = Math.max(
				start.y / source.scaleFactor,
				end.y / source.scaleFactor,
			)
			const selectionTop = Math.min(
				start.y / source.scaleFactor,
				end.y / source.scaleFactor,
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

	/** 面板挂在激活的工具按钮下方，并保证不出工具栏右边界 */
	const panelLeft = Math.max(
		0,
		Math.min(
			activeToolIndex * TOOL_SLOT_WIDTH,
			Math.max(0, toolbarSize.width - STYLE_PANEL_WIDTH),
		),
	)

	return (
		<div
			ref={toolbarRef}
			className={`fixed flex items-center gap-1 shrink-0 whitespace-nowrap bg-[#2C2C2C] px-2 py-1.5 rounded-lg shadow-xl z-50 border border-[#3D3D3D] transition-all
        ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
			style={{
				left: `${position?.left ?? -9999}px`,
				top: `${position?.top ?? -9999}px`,
				// 使用内联样式确保初始渲染时有正确尺寸
				visibility: show ? 'visible' : 'hidden',
			}}
		>
			{TOOL_BUTTONS.map(tool => (
				<ToolButton
					key={tool.tool}
					title={tool.title}
					active={activeState === tool.tool}
					onClick={() => onTriggerEvent(tool.event)}
				>
					{tool.icon}
				</ToolButton>
			))}

			<ToolButton
				title="清除标注"
				onClick={() => onTriggerEvent('CLEAR_DRAW')}
			>
				<Trash2 className="w-4 h-4" />
			</ToolButton>

			<Separator />

			<ToolButton title="取消" danger onClick={() => onTriggerEvent('CANCEL')}>
				<X className="w-4 h-4" />
			</ToolButton>
			<ToolButton
				title="悬停窗口"
				warning
				onClick={() => onTriggerEvent('HOVER')}
			>
				<Pin className="w-4 h-4" />
			</ToolButton>
			<ToolButton
				title="保存到剪贴板"
				success
				onClick={() => onTriggerEvent('SAVE')}
			>
				<Check className="w-4 h-4" />
			</ToolButton>

			{activeToolIndex >= 0 && (
				<div
					className="absolute top-full mt-2 z-[60] rounded-lg border border-[#4A4A4A] bg-[#383838] p-2 shadow-xl"
					style={{ left: panelLeft, width: STYLE_PANEL_WIDTH }}
				>
					<div className="flex items-center justify-between gap-1">
						{COLOR_OPTIONS.map(color => (
							<button
								key={color}
								title={color}
								onClick={() => onColorChange(color)}
								className={`w-4 h-4 shrink-0 rounded-sm border transition ${
									drawColor.toLowerCase() === color.toLowerCase()
										? 'border-white'
										: 'border-transparent hover:border-white/60'
								}`}
								style={{ backgroundColor: color }}
							/>
						))}
					</div>
					<input
						type="color"
						title="自定义颜色"
						className="mt-2 w-full h-6 cursor-pointer rounded bg-transparent"
						value={drawColor}
						onChange={e => onColorChange(e.target.value)}
					/>
					<div className="mt-2 flex items-center gap-2">
						<span className="text-[10px] text-[#B0B0B0] w-7 shrink-0">
							{isTextMode ? '字号' : '粗细'}
						</span>
						<input
							type="range"
							min={sizeRange.min}
							max={sizeRange.max}
							value={sizeValue}
							onChange={e => {
								const value = parseInt(e.target.value)

								if (isTextMode) {
									onFontSizeChange(value)
								} else {
									onWidthChange(value)
								}
							}}
							className="flex-1 h-1 bg-[#4A4A4A] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
						/>
						<span className="text-[10px] text-white w-8 text-right tabular-nums shrink-0">
							{sizeValue}px
						</span>
					</div>
				</div>
			)}
		</div>
	)
}
