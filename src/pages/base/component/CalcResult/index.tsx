import {
	Binary,
	Calculator,
	Clock,
	Copy,
	Hash,
	Lightbulb,
	Palette,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { TQuickResult } from '../../utils/quickTools'

type TProps = {
	result: TQuickResult
	/** 回车复制主结果 */
	onCopy: () => void
	/** 点击某一附加行，复制该行内容 */
	onCopyRow: (value: string) => void
}

/** 按分类挑图标，让结果卡的视觉语义一眼可辨 */
function getKindIcon(kind: string): ReactNode {
	if (kind === '计算') return <Calculator className="size-4" />
	if (kind === '时间戳') return <Clock className="size-4" />
	if (kind === '进制转换') return <Binary className="size-4" />
	if (kind === '颜色转换') return <Palette className="size-4" />
	if (kind.startsWith('Base64')) return <Binary className="size-4" />
	if (kind === 'MD5' || kind.startsWith('SHA')) {
		return <Hash className="size-4" />
	}
	return <Lightbulb className="size-4" />
}

export function CalcResult({ result, onCopy, onCopyRow }: TProps) {
	const isColor = result.kind === '颜色转换' && !!result.swatch

	return (
		<div className="px-3 pt-3">
			<div className="rounded-lg border border-blue-200 bg-blue-50/60 transition-colors">
				{/* 主结果：整块可点，回车等同于点这里 */}
				<button
					type="button"
					onClick={onCopy}
					onKeyDown={event => {
						if (event.key !== 'Enter' && event.key !== ' ') return
						event.preventDefault()
						event.stopPropagation()
						onCopy()
					}}
					title={`复制${result.kind}结果`}
					className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-blue-50"
				>
					<div className="flex min-w-0 items-center gap-3">
						<span
							className="flex size-9 shrink-0 items-center justify-center rounded-md text-blue-500 shadow-sm"
							style={
								isColor
									? { backgroundColor: result.swatch, border: '1px solid rgba(0,0,0,0.12)' }
									: { backgroundColor: '#fff' }
							}
						>
							{!isColor && getKindIcon(result.kind)}
						</span>
						<div className="min-w-0">
							<div className="flex items-center gap-1.5">
								<span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-blue-500 shadow-sm">
									{result.kind}
								</span>
								<span className="truncate font-mono text-xs text-gray-500">
									{result.expression}
								</span>
							</div>
							<div className="truncate text-xl font-semibold text-gray-800">
								{result.kind === '计算' ? '= ' : ''}
								{result.value}
							</div>
						</div>
					</div>
					<span className="shrink-0 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px] text-blue-500">
						↵ 复制
					</span>
				</button>

				{/* 附加行：分开列出，点哪行复制哪行 */}
				{result.rows.length > 0 && (
					<div className="grid grid-cols-2 gap-x-3 gap-y-1 border-t border-blue-100 px-3 py-2">
						{result.rows.map(row => (
							<button
								key={`${row.label}-${row.value}`}
								type="button"
								onClick={() => onCopyRow(row.value)}
								title={`复制 ${row.label}`}
								className="group flex min-w-0 items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-white"
							>
								<span className="w-16 shrink-0 truncate text-[10px] text-gray-400">
									{row.label}
								</span>
								<span className="truncate font-mono text-xs text-gray-700">
									{row.value}
								</span>
								{/* 复制提示只在悬停时出现，平时不喧宾夺主 */}
								<Copy className="ml-auto size-2.5 shrink-0 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
