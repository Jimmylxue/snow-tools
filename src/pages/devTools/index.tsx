import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Binary,
	Check,
	Clock,
	Copy,
	Hash,
	Palette,
	Wand2,
	X,
} from 'lucide-react'
import { toast } from 'sonner'
import { copyToClipboard } from '@/lib/utils'
import { sendNavigateBack } from '@/hooks/ipc/window'
import {
	describeEmptyReason,
	getDevToolMeta,
	resolveCategoryInput,
	TDevToolCategory,
} from './utils/categories'

/** 每个工具页顶部的图标，和首页入口图标语义一致 */
const CATEGORY_ICONS: Record<TDevToolCategory, React.ReactNode> = {
	timestamp: <Clock className="size-4" />,
	radix: <Binary className="size-4" />,
	color: <Palette className="size-4" />,
	base64: <Binary className="size-4" />,
	hash: <Hash className="size-4" />,
}

type TProps = {
	category: TDevToolCategory
}

export function DevTools({ category }: TProps) {
	const meta = useMemo(() => getDevToolMeta(category), [category])
	const [input, setInput] = useState('')
	/** 刚复制过的那一行，短暂显示对勾 */
	const [copiedKey, setCopiedKey] = useState<string | null>(null)
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const copiedTimer = useRef<number | null>(null)

	const result = useMemo(
		() => resolveCategoryInput(category, input),
		[category, input],
	)

	/** 每个工具页都有自己的窗口，唤醒时只聚焦自己那个 */
	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	useEffect(() => {
		const channel = 'DEV_TOOLS_WINDOW_SHOWN'
		const handleShown = () => {
			window.setTimeout(() => inputRef.current?.focus(), 30)
		}

		window.ipcRenderer.on(channel, handleShown)
		return () => {
			window.ipcRenderer.off(channel, handleShown)
		}
	}, [])

	useEffect(() => {
		return () => {
			if (copiedTimer.current !== null) {
				window.clearTimeout(copiedTimer.current)
			}
		}
	}, [])

	const copy = useCallback((value: string, key: string) => {
		copyToClipboard(value)
		setCopiedKey(key)

		if (copiedTimer.current !== null) {
			window.clearTimeout(copiedTimer.current)
		}
		copiedTimer.current = window.setTimeout(() => {
			setCopiedKey(null)
			copiedTimer.current = null
		}, 1200)
	}, [])

	const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		/** Enter 复制主结果，Shift+Enter 换行，和启动器里的手感一致 */
		if (event.key !== 'Enter' || event.shiftKey) return
		if (event.nativeEvent.isComposing) return

		event.preventDefault()

		if (!result) {
			toast.error(describeEmptyReason(category, input))
			return
		}

		copy(result.value, 'main')
	}

	return (
		<div className="flex h-screen w-screen flex-col bg-slate-50 text-slate-800">
			<header className="flex items-start justify-between border-b border-slate-200 bg-white px-5 py-3">
				<div className="flex items-center gap-2.5">
					<span className="flex size-7 items-center justify-center rounded-md bg-blue-50 text-blue-500">
						{CATEGORY_ICONS[category]}
					</span>
					<div>
						<h1 className="text-base font-semibold leading-tight">{meta.name}</h1>
						<p className="mt-0.5 text-xs text-slate-500">{meta.description}</p>
					</div>
				</div>
				<button
					type="button"
					title="关闭"
					onClick={() => sendNavigateBack()}
					className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
				>
					<X className="size-4" />
				</button>
			</header>

			<div className="flex min-h-0 flex-1">
				{/* 输入区 */}
				<section className="flex w-[46%] shrink-0 flex-col border-r border-slate-200 bg-white">
					<div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
						<span className="text-xs font-medium text-slate-600">输入</span>
						<button
							type="button"
							onClick={() => {
								setInput(meta.sample)
								inputRef.current?.focus()
							}}
							className="flex items-center gap-1 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600"
						>
							<Wand2 className="size-2.5" />
							试试示例
						</button>
					</div>

					<textarea
						ref={inputRef}
						value={input}
						onChange={event => setInput(event.target.value)}
						onKeyDown={handleKeyDown}
						spellCheck={false}
						placeholder={meta.placeholder}
						className="min-h-0 flex-1 resize-none border-0 bg-transparent p-4 font-mono text-sm text-slate-800 outline-none placeholder:text-slate-300"
					/>

					<div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400">
						Enter 复制主结果 · Shift+Enter 换行
					</div>
				</section>

				{/* 结果区 */}
				<section className="flex min-w-0 flex-1 flex-col overflow-y-auto p-4">
					{result ? (
						<div className="space-y-2">
							{/* 主结果：最常用的一项，字最大，Enter 复制的就是它 */}
							<button
								type="button"
								onClick={() => copy(result.value, 'main')}
								title="复制主结果（Enter）"
								className="group flex w-full items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
							>
								<span
									className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md text-blue-500 shadow-sm"
									style={
										result.swatch
											? {
													backgroundColor: result.swatch,
													border: '1px solid rgba(0,0,0,0.12)',
												}
											: { backgroundColor: '#fff' }
									}
								>
									{!result.swatch && CATEGORY_ICONS[category]}
								</span>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-1.5">
										<span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-blue-500 shadow-sm">
											{result.kind}
										</span>
										<span className="truncate font-mono text-xs text-slate-400">
											{result.expression}
										</span>
									</div>
									<div className="mt-0.5 break-all text-lg font-semibold text-slate-800">
										{result.value}
									</div>
								</div>
								{copiedKey === 'main' ? (
									<Check className="mt-1 size-4 shrink-0 text-green-500" />
								) : (
									<span className="mt-1 shrink-0 rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[10px] text-blue-500">
										↵ 复制
									</span>
								)}
							</button>

							{/* 其他换算结果，点哪一行复制哪一行 */}
							{result.rows.length > 0 && (
								<div className="space-y-1.5 pt-1">
									{result.rows.map(row => (
										<button
											key={`${row.label}-${row.value}`}
											type="button"
											onClick={() => copy(row.value, row.label)}
											title={`复制 ${row.label}`}
											className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-blue-200 hover:bg-slate-50"
										>
											<span className="w-20 shrink-0 truncate text-[11px] text-slate-400">
												{row.label}
											</span>
											<span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">
												{row.value}
											</span>
											{copiedKey === row.label ? (
												<Check className="size-3.5 shrink-0 text-green-500" />
											) : (
												<Copy className="size-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
											)}
										</button>
									))}
								</div>
							)}
						</div>
					) : (
						<div className="flex h-full flex-col items-center justify-center gap-2 text-center">
							<span className="flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-300">
								{CATEGORY_ICONS[category]}
							</span>
							<p className="max-w-[260px] text-xs leading-relaxed text-slate-400">
								{describeEmptyReason(category, input)}
							</p>
						</div>
					)}
				</section>
			</div>
		</div>
	)
}
