import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useMemo,
	useState,
} from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
	TOKEN_CLASS,
	analyzeFolds,
	collapsedLine,
	tokenizeLine,
} from '../utils/folds'

export type TJsonFoldViewerHandle = {
	collapseAll: () => void
	expandAll: () => void
}

type TProps = {
	value: string
	className?: string
}

type TRow = {
	lineIndex: number
	text: string
	foldable: boolean
	folded: boolean
}

export const JsonFoldViewer = forwardRef<TJsonFoldViewerHandle, TProps>(
	function JsonFoldViewer({ value, className }, ref) {
		const [folded, setFolded] = useState<Set<number>>(() => new Set())

		const lines = useMemo(() => value.split('\n'), [value])
		const folds = useMemo(() => analyzeFolds(lines), [lines])

		useEffect(() => {
			setFolded(new Set())
		}, [value])

		useImperativeHandle(
			ref,
			() => ({
				collapseAll: () => setFolded(new Set(folds.keys())),
				expandAll: () => setFolded(new Set()),
			}),
			[folds],
		)

		const hiddenLines = useMemo(() => {
			const hidden = new Set<number>()
			for (const openLine of folded) {
				const range = folds.get(openLine)
				if (!range) continue
				for (
					let lineIndex = openLine + 1;
					lineIndex <= range.closeLine;
					lineIndex++
				) {
					hidden.add(lineIndex)
				}
			}
			return hidden
		}, [folded, folds])

		const rows = useMemo(() => {
			const result: TRow[] = []
			lines.forEach((line, lineIndex) => {
				if (hiddenLines.has(lineIndex)) return

				const range = folds.get(lineIndex)
				const isFolded = folded.has(lineIndex)

				result.push({
					lineIndex,
					text:
						isFolded && range
							? collapsedLine(line, lines[range.closeLine])
							: line,
					foldable: !!range,
					folded: isFolded,
				})
			})
			return result
		}, [lines, folds, folded, hiddenLines])

		const toggleFold = (lineIndex: number) => {
			setFolded(previous => {
				const next = new Set(previous)
				if (next.has(lineIndex)) {
					next.delete(lineIndex)
				} else {
					next.add(lineIndex)
				}
				return next
			})
		}

		return (
			<div
				className={cn(
					'h-full min-h-0 overflow-auto rounded-lg border border-slate-200 bg-white',
					className,
				)}
			>
				<div className="min-w-max">
					{rows.map(row => (
						<div key={row.lineIndex} className="flex h-5">
							<div className="sticky left-0 z-10 flex h-5 w-14 shrink-0 select-none items-center justify-end gap-0.5 border-r border-slate-100 bg-slate-50 pr-1.5">
								{row.foldable ? (
									<button
										type="button"
										className="flex size-4 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
										onClick={() =>
											toggleFold(row.lineIndex)
										}
										title={row.folded ? '展开' : '折叠'}
										aria-label={
											row.folded
												? `展开第 ${row.lineIndex + 1} 行`
												: `折叠第 ${row.lineIndex + 1} 行`
										}
										aria-expanded={!row.folded}
									>
										{row.folded ? (
											<ChevronRight className="size-3" />
										) : (
											<ChevronDown className="size-3" />
										)}
									</button>
								) : (
									<span className="size-4 shrink-0" />
								)}
								<span className="min-w-[2ch] text-right font-mono text-[11px] leading-5 text-slate-300">
									{row.lineIndex + 1}
								</span>
							</div>
							<div className="whitespace-pre pl-3 pr-6 font-mono text-[13px] leading-5">
								{tokenizeLine(row.text).map((token, index) => (
									<span
										key={index}
										className={TOKEN_CLASS[token.kind]}
									>
										{token.text}
									</span>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		)
	},
)
