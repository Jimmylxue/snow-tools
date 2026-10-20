import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useRef,
} from 'react'
import { cn } from '@/lib/utils'

const LINE_HEIGHT = 20
const PADDING_Y = 8

export type TJsonEditorHandle = {
	focus: () => void
	jumpTo: (position: number) => void
}

type TProps = {
	value: string
	onChange?: (value: string) => void
	readOnly?: boolean
	errorLine?: number | null
	placeholder?: string
	label: string
	className?: string
}

export const JsonEditor = forwardRef<TJsonEditorHandle, TProps>(
	function JsonEditor(
		{
			value,
			onChange,
			readOnly = false,
			errorLine = null,
			placeholder,
			label,
			className,
		},
		ref,
	) {
		const textareaRef = useRef<HTMLTextAreaElement>(null)
		const gutterRef = useRef<HTMLDivElement>(null)
		const errorBarRef = useRef<HTMLDivElement>(null)

		const lineCount = useMemo(() => value.split('\n').length, [value])
		const lineNumbers = useMemo(
			() =>
				Array.from({ length: lineCount }, (_, index) => index + 1).join(
					'\n',
				),
			[lineCount],
		)

		const syncScroll = useCallback(() => {
			const textarea = textareaRef.current
			if (!textarea) return
			if (gutterRef.current) {
				gutterRef.current.scrollTop = textarea.scrollTop
			}
			if (errorBarRef.current) {
				errorBarRef.current.style.transform = `translateY(-${textarea.scrollTop}px)`
			}
		}, [])

		useImperativeHandle(
			ref,
			() => ({
				focus: () => textareaRef.current?.focus(),
				jumpTo: (position: number) => {
					const textarea = textareaRef.current
					if (!textarea) return
					const safePosition = Math.max(
						0,
						Math.min(position, value.length),
					)
					const line = value
						.slice(0, safePosition)
						.split('\n').length
					textarea.focus()
					textarea.setSelectionRange(safePosition, safePosition)
					textarea.scrollTop = Math.max(
						0,
						(line - 1) * LINE_HEIGHT -
							textarea.clientHeight / 2 +
							LINE_HEIGHT,
					)
					syncScroll()
				},
			}),
			[value, syncScroll],
		)

		useEffect(() => {
			syncScroll()
		}, [value, syncScroll])

		return (
			<div
				className={cn(
					'relative flex h-full min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors focus-within:border-blue-300',
					readOnly && 'bg-slate-50/40',
					className,
				)}
			>
				{errorLine !== null && (
					<div
						ref={errorBarRef}
						className="pointer-events-none absolute inset-x-0 z-0 h-5 bg-red-50"
						style={{
							top: PADDING_Y + (errorLine - 1) * LINE_HEIGHT,
						}}
					/>
				)}
				<div
					ref={gutterRef}
					className="relative z-10 h-full w-12 shrink-0 overflow-hidden border-r border-slate-100 bg-slate-50/70"
				>
					<pre className="select-none py-2 pr-2 text-right font-mono text-[13px] leading-5 text-slate-300">
						{lineNumbers}
					</pre>
				</div>
				<textarea
					ref={textareaRef}
					value={value}
					onChange={event => onChange?.(event.target.value)}
					onScroll={syncScroll}
					readOnly={readOnly}
					spellCheck={false}
					autoCapitalize="off"
					autoCorrect="off"
					wrap="off"
					placeholder={placeholder}
					aria-label={label}
					className={cn(
						'relative z-10 h-full w-full resize-none overflow-auto bg-transparent py-2 pl-3 pr-4 font-mono text-[13px] leading-5 outline-none placeholder:text-slate-300',
						readOnly ? 'text-slate-600' : 'text-slate-700',
					)}
				/>
			</div>
		)
	},
)
