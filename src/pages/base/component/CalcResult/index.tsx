import { Calculator } from 'lucide-react'

type TProps = {
	expression: string
	value: string
	onCopy: () => void
}

export function CalcResult({ expression, value, onCopy }: TProps) {
	return (
		<div className="px-3 pt-3">
			<button
				type="button"
				onClick={onCopy}
				onKeyDown={event => {
					if (event.key !== 'Enter' && event.key !== ' ') return
					event.preventDefault()
					event.stopPropagation()
					onCopy()
				}}
				title="复制计算结果"
				className="flex w-full items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
			>
				<div className="flex min-w-0 items-center gap-3">
					<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white text-blue-500 shadow-sm">
						<Calculator className="size-4" />
					</span>
					<div className="min-w-0">
						<div className="truncate font-mono text-xs text-gray-500">
							{expression}
						</div>
						<div className="truncate text-xl font-semibold text-gray-800">
							= {value}
						</div>
					</div>
				</div>
				<span className="shrink-0 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px] text-blue-500">
					↵ 复制
				</span>
			</button>
		</div>
	)
}
