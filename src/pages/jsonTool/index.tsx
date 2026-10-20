import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type DragEvent,
} from 'react'
import dayjs from 'dayjs'
import {
	Braces,
	CheckCircle2,
	ChevronsDownUp,
	ChevronsUpDown,
	Copy,
	Download,
	FileCode2,
	FolderOpen,
	History,
	Minimize2,
	Quote,
	Sparkles,
	Trash2,
	Undo2,
	XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { copyToClipboard } from '@/lib/utils'
import { openJsonFile, saveJsonFile } from '@/hooks/ipc/jsonTool'
import JsonSvg from '@/assets/img/tool-json.svg'
import { JsonEditor, type TJsonEditorHandle } from './components/JsonEditor'
import {
	JsonFoldViewer,
	type TJsonFoldViewerHandle,
} from './components/JsonFoldViewer'
import { countJsonFolds } from './utils/folds'
import {
	escapeJsonText,
	parseJson,
	sortJsonKeys,
	stringifyJson,
	unescapeJsonText,
	type TJsonError,
	type TJsonIndent,
	type TJsonSortOrder,
} from './utils/json'
import { jsonToTypeScript } from './utils/tsType'
import {
	loadJsonHistory,
	pushJsonHistory,
	saveJsonHistory,
	type TJsonHistoryItem,
} from './history'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_FOLD_LINES = 3000
const MAX_FOLD_SIZE = 500 * 1024

const SAMPLE_JSON = `{
  "code": 0,
  "message": "success",
  "data": {
    "user": {
      "id": 1001,
      "name": "张三",
      "vip": true,
      "tags": ["前端", "小程序"]
    },
    "orders": [
      {
        "id": "A20261020",
        "amount": 128.5,
        "paid": true,
        "createdAt": "2026-10-20 12:30:00"
      },
      {
        "id": "A20261021",
        "amount": 66,
        "paid": false,
        "createdAt": "2026-10-20 18:00:00"
      }
    ]
  }
}`

type TAction = 'format' | 'minify' | 'escape' | 'unescape' | 'types'

type TOutputKind = 'json' | 'types'

type TInputState =
	| { status: 'empty' }
	| { status: 'valid'; lines: number }
	| { status: 'invalid'; error: TJsonError }

const ACTION_LABELS: Record<TAction, string> = {
	format: '格式化',
	minify: '压缩',
	escape: '转义',
	unescape: '还原',
	types: 'TS 类型',
}

export function JsonTool() {
	const [input, setInput] = useState('')
	const [output, setOutput] = useState('')
	const [outputKind, setOutputKind] = useState<TOutputKind | null>(null)
	const [indent, setIndent] = useState<TJsonIndent>('2')
	const [sortOrder, setSortOrder] = useState<TJsonSortOrder>('none')
	const [inputState, setInputState] = useState<TInputState>({
		status: 'empty',
	})
	const [history, setHistory] = useState<TJsonHistoryItem[]>(loadJsonHistory)
	const [historyOpen, setHistoryOpen] = useState(false)
	const [dragging, setDragging] = useState(false)
	const editorRef = useRef<TJsonEditorHandle>(null)
	const foldViewerRef = useRef<TJsonFoldViewerHandle>(null)
	const dragDepth = useRef(0)

	useEffect(() => {
		if (!input.trim()) {
			setInputState({ status: 'empty' })
			return
		}

		const timer = window.setTimeout(() => {
			const result = parseJson(input)
			setInputState(
				result.ok
					? { status: 'valid', lines: input.split('\n').length }
					: { status: 'invalid', error: result.error },
			)
		}, 160)

		return () => window.clearTimeout(timer)
	}, [input])

	const foldState = useMemo(() => {
		if (outputKind !== 'json' || !output) {
			return { enabled: false, tooLarge: false, foldCount: 0 }
		}

		if (
			output.length > MAX_FOLD_SIZE ||
			output.split('\n').length > MAX_FOLD_LINES
		) {
			return { enabled: false, tooLarge: true, foldCount: 0 }
		}

		if (!parseJson(output).ok) {
			return { enabled: false, tooLarge: false, foldCount: 0 }
		}

		return {
			enabled: true,
			tooLarge: false,
			foldCount: countJsonFolds(output),
		}
	}, [output, outputKind])

	useEffect(() => {
		editorRef.current?.focus()
	}, [])

	useEffect(() => {
		const handleShown = () => {
			window.setTimeout(() => editorRef.current?.focus(), 30)
		}

		window.ipcRenderer.on('JSON_WINDOW_SHOWN', handleShown)
		return () => {
			window.ipcRenderer.off('JSON_WINDOW_SHOWN', handleShown)
		}
	}, [])

	const parseInput = useCallback(():
		| { ok: true; value: unknown }
		| { ok: false } => {
		if (!input.trim()) {
			toast('先输入或拖入 JSON')
			return { ok: false }
		}

		const result = parseJson(input)
		if (!result.ok) {
			setInputState({ status: 'invalid', error: result.error })
			editorRef.current?.jumpTo(result.error.position)
			toast.error(
				`第 ${result.error.line} 行第 ${result.error.column} 列：${result.error.message}`,
			)
			return { ok: false }
		}

		setInputState({ status: 'valid', lines: input.split('\n').length })
		return { ok: true, value: result.value }
	}, [input])

	const remember = useCallback(
		(action: TAction) => {
			setHistory(previous =>
				pushJsonHistory(input, ACTION_LABELS[action], previous),
			)
		},
		[input],
	)

	const run = useCallback(
		(action: TAction) => {
			if (!input.trim()) {
				toast('先输入或拖入 JSON')
				return
			}

			if (action === 'escape') {
				setOutput(escapeJsonText(input))
				setOutputKind('json')
				remember(action)
				return
			}

			if (action === 'unescape') {
				const result = unescapeJsonText(input, indent)
				if (!result.ok) {
					toast.error(result.message)
					return
				}
				setOutput(result.text)
				setOutputKind('json')
				remember(action)
				return
			}

			const parsed = parseInput()
			if (!parsed.ok) return

			const normalized =
				sortOrder === 'none'
					? parsed.value
					: sortJsonKeys(parsed.value, sortOrder)

			if (action === 'types') {
				setOutput(jsonToTypeScript(normalized))
				setOutputKind('types')
			} else {
				setOutput(
					stringifyJson(normalized, indent, action === 'minify'),
				)
				setOutputKind('json')
			}
			remember(action)
		},
		[input, indent, sortOrder, parseInput, remember],
	)

	const handleCopy = useCallback(() => {
		if (!output) {
			toast('还没有可复制的结果')
			return
		}
		copyToClipboard(output)
		toast.success('已复制到剪贴板')
	}, [output])

	const handleExport = useCallback(async () => {
		const content = output || input
		if (!content.trim()) {
			toast('还没有可导出的内容')
			return
		}

		const extension = outputKind === 'types' ? 'ts' : 'json'
		const defaultName = `data-${dayjs().format('YYYYMMDD-HHmmss')}.${extension}`

		try {
			const result = await saveJsonFile({ defaultName, content })
			if (result.canceled) return
			toast.success(`已保存到 ${result.filePath}`)
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : '导出文件失败',
			)
		}
	}, [input, output, outputKind])

	const handleOpenFile = useCallback(async () => {
		try {
			const result = await openJsonFile()
			if (result.canceled) return
			setInput(result.content)
			setOutput('')
			setOutputKind(null)
			toast.success(`已打开 ${result.fileName}`)
			requestAnimationFrame(() => editorRef.current?.focus())
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : '打开文件失败',
			)
		}
	}, [])

	const loadFile = useCallback(async (file: File) => {
		if (file.size > MAX_FILE_SIZE) {
			toast.error('文件超过 5MB，暂不支持')
			return
		}

		try {
			const content = await file.text()
			setInput(content)
			setOutput('')
			setOutputKind(null)
			toast.success(`已载入 ${file.name}`)
			requestAnimationFrame(() => editorRef.current?.focus())
		} catch {
			toast.error('读取文件失败')
		}
	}, [])

	const loadSample = () => {
		setInput(SAMPLE_JSON)
		setOutput('')
		setOutputKind(null)
		requestAnimationFrame(() => editorRef.current?.focus())
	}

	const clearAll = () => {
		if (!input && !output) return
		setInput('')
		setOutput('')
		setOutputKind(null)
		requestAnimationFrame(() => editorRef.current?.focus())
	}

	const restoreHistory = (item: TJsonHistoryItem) => {
		setInput(item.input)
		setOutput('')
		setOutputKind(null)
		setHistoryOpen(false)
		toast('已载入历史内容')
		requestAnimationFrame(() => editorRef.current?.focus())
	}

	const removeHistory = (id: string) => {
		setHistory(previous => {
			const next = previous.filter(item => item.id !== id)
			saveJsonHistory(next)
			return next
		})
	}

	const clearHistory = () => {
		setHistory([])
		saveJsonHistory([])
	}

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey)) return

			if (event.key === 'Enter') {
				event.preventDefault()
				run('format')
				return
			}

			const key = event.key.toLowerCase()
			if (event.shiftKey && key === 'm') {
				event.preventDefault()
				run('minify')
				return
			}

			if (!event.shiftKey && key === 's') {
				event.preventDefault()
				void handleExport()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [run, handleExport])

	const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault()
		dragDepth.current += 1
		setDragging(true)
	}

	const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault()
		dragDepth.current -= 1
		if (dragDepth.current <= 0) {
			dragDepth.current = 0
			setDragging(false)
		}
	}

	const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault()
		event.dataTransfer.dropEffect = 'copy'
	}

	const handleDrop = (event: DragEvent<HTMLDivElement>) => {
		event.preventDefault()
		dragDepth.current = 0
		setDragging(false)

		const file = event.dataTransfer.files[0]
		if (file) void loadFile(file)
	}

	return (
		<div
			className="relative flex h-screen w-screen flex-col bg-white text-slate-800"
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			<header className="flex items-center justify-between border-b border-slate-100 px-5 pb-3 pt-4">
				<div className="flex items-center gap-3">
					<img src={JsonSvg} className="size-9" alt="JSON" />
					<div>
						<h1 className="text-base font-semibold">JSON 工具</h1>
						<p className="text-xs text-slate-500">
							格式化、压缩、转义与 TypeScript 类型生成
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => void handleOpenFile()}
					>
						<FolderOpen className="size-3.5" />
						打开
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setHistoryOpen(true)}
					>
						<History className="size-3.5" />
						历史
					</Button>
					<Button variant="ghost" size="sm" onClick={loadSample}>
						<Sparkles className="size-3.5" />
						示例
					</Button>
					<Button variant="ghost" size="sm" onClick={clearAll}>
						<Trash2 className="size-3.5" />
						清空
					</Button>
				</div>
			</header>

			<div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
				<Button size="sm" onClick={() => run('format')}>
					<Braces className="size-3.5" />
					格式化
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => run('minify')}
				>
					<Minimize2 className="size-3.5" />
					压缩
				</Button>
				<div className="mx-1 h-5 w-px bg-slate-200" />
				<Button
					variant="outline"
					size="sm"
					onClick={() => run('escape')}
				>
					<Quote className="size-3.5" />
					转义
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => run('unescape')}
				>
					<Undo2 className="size-3.5" />
					还原
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => run('types')}
				>
					<FileCode2 className="size-3.5" />
					TS 类型
				</Button>

				<div className="ml-auto flex items-center gap-2">
					<span className="text-xs text-slate-400">缩进</span>
					<Select
						value={indent}
						onValueChange={value =>
							setIndent(value as TJsonIndent)
						}
					>
						<SelectTrigger className="h-8 w-[92px] text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="2" className="text-xs">
								2 空格
							</SelectItem>
							<SelectItem value="4" className="text-xs">
								4 空格
							</SelectItem>
							<SelectItem value="tab" className="text-xs">
								Tab
							</SelectItem>
						</SelectContent>
					</Select>

					<span className="ml-2 text-xs text-slate-400">
						Key 排序
					</span>
					<Select
						value={sortOrder}
						onValueChange={value =>
							setSortOrder(value as TJsonSortOrder)
						}
					>
						<SelectTrigger className="h-8 w-[104px] text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none" className="text-xs">
								不排序
							</SelectItem>
							<SelectItem value="asc" className="text-xs">
								A → Z
							</SelectItem>
							<SelectItem value="desc" className="text-xs">
								Z → A
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			<main className="flex min-h-0 flex-1">
				<section className="flex min-w-0 flex-1 flex-col border-r border-slate-100">
					<div className="flex h-9 shrink-0 items-center justify-between px-3">
						<span className="text-xs font-medium text-slate-500">
							输入
						</span>
						<span className="text-[11px] text-slate-400">
							{input.split('\n').length} 行 ·{' '}
							{input.length.toLocaleString()} 字符
						</span>
					</div>
					<div className="min-h-0 flex-1 px-3 pb-3">
						<JsonEditor
							ref={editorRef}
							value={input}
							onChange={setInput}
							errorLine={
								inputState.status === 'invalid'
									? inputState.error.line
									: null
							}
							placeholder="粘贴 JSON，或把 .json 文件拖进来…"
							label="JSON 输入"
						/>
					</div>
				</section>

				<section className="flex min-w-0 flex-1 flex-col">
					<div className="flex h-9 shrink-0 items-center justify-between px-3">
						<div className="flex items-center gap-2">
							<span className="text-xs font-medium text-slate-500">
								输出
							</span>
							{outputKind && (
								<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
									{outputKind === 'types'
										? 'TypeScript'
										: 'JSON'}
								</span>
							)}
							{foldState.tooLarge && (
								<span
									className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-600"
									title="内容较大，为保证流畅度已关闭折叠"
								>
									折叠已关闭
								</span>
							)}
							{output && (
								<span className="text-[11px] text-slate-400">
									{output.length.toLocaleString()} 字符
								</span>
							)}
						</div>
						<div className="flex items-center gap-0.5">
							{foldState.enabled && foldState.foldCount > 0 && (
								<>
									<Button
										variant="ghost"
										size="icon"
										className="size-7 text-slate-400"
										title="全部折叠"
										onClick={() =>
											foldViewerRef.current?.collapseAll()
										}
									>
										<ChevronsDownUp className="size-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="size-7 text-slate-400"
										title="全部展开"
										onClick={() =>
											foldViewerRef.current?.expandAll()
										}
									>
										<ChevronsUpDown className="size-3.5" />
									</Button>
									<div className="mx-1 h-4 w-px bg-slate-200" />
								</>
							)}
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={handleCopy}
								disabled={!output}
							>
								<Copy className="size-3.5" />
								复制
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={() => void handleExport()}
								disabled={!output && !input}
							>
								<Download className="size-3.5" />
								导出
							</Button>
						</div>
					</div>
					<div className="min-h-0 flex-1 px-3 pb-3">
						{foldState.enabled ? (
							<JsonFoldViewer
								ref={foldViewerRef}
								value={output}
							/>
						) : (
							<JsonEditor
								value={output}
								readOnly
								placeholder="处理结果会显示在这里"
								label="JSON 输出"
							/>
						)}
					</div>
				</section>
			</main>

			<footer className="flex h-9 shrink-0 items-center justify-between border-t border-slate-100 px-5 text-xs">
				<div className="min-w-0">
					{inputState.status === 'empty' && (
						<span className="text-slate-400">
							等待输入 · 支持拖拽文件
						</span>
					)}
					{inputState.status === 'valid' && (
						<span className="flex items-center gap-1.5 text-green-600">
							<CheckCircle2 className="size-3.5" />
							合法 JSON · {inputState.lines} 行
						</span>
					)}
					{inputState.status === 'invalid' && (
						<button
							type="button"
							className="flex max-w-full items-center gap-1.5 text-left text-red-500 hover:underline"
							title={inputState.error.detail}
							onClick={() =>
								editorRef.current?.jumpTo(
									inputState.error.position,
								)
							}
						>
							<XCircle className="size-3.5 shrink-0" />
							<span className="truncate">
								第 {inputState.error.line} 行第{' '}
								{inputState.error.column} 列：
								{inputState.error.message}
							</span>
						</button>
					)}
				</div>
				<span className="shrink-0 text-slate-400">
					⌘↵ 格式化 · ⌘⇧M 压缩 · ⌘S 导出
				</span>
			</footer>

			{dragging && (
				<div className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-blue-300 bg-blue-50/85 text-blue-600">
					<FolderOpen className="size-10" />
					<p className="text-sm font-medium">松开以读取 JSON 文件</p>
				</div>
			)}

			<Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
				<DialogContent className="max-w-[520px] gap-3 p-5">
					<DialogHeader>
						<DialogTitle className="text-base">
							历史记录
						</DialogTitle>
						<DialogDescription className="text-xs">
							最近处理过的内容，最多保留 20 条
						</DialogDescription>
					</DialogHeader>

					<div className="max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
						{history.length === 0 ? (
							<div className="py-10 text-center text-sm text-slate-400">
								还没有历史记录
							</div>
						) : (
							history.map(item => (
								<div
									key={item.id}
									className="group flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
								>
									<button
										type="button"
										className="min-w-0 flex-1 text-left"
										onClick={() => restoreHistory(item)}
									>
										<div className="flex items-center gap-2 text-[11px] text-slate-400">
											<span>
												{dayjs(item.time).format(
													'MM-DD HH:mm',
												)}
											</span>
											<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
												{item.action}
											</span>
											<span>
												{item.input.length.toLocaleString()}{' '}
												字符
											</span>
										</div>
										<div className="mt-0.5 truncate font-mono text-xs text-slate-600">
											{item.input
												.replace(/\s+/g, ' ')
												.slice(0, 120)}
										</div>
									</button>
									<Button
										variant="ghost"
										size="icon"
										className="size-7 text-red-400 opacity-0 hover:text-red-500 group-hover:opacity-100"
										title="删除该记录"
										onClick={() => removeHistory(item.id)}
									>
										<Trash2 className="size-3.5" />
									</Button>
								</div>
							))
						)}
					</div>

					{history.length > 0 && (
						<div className="flex justify-end border-t border-slate-100 pt-3">
							<Button
								variant="ghost"
								size="sm"
								className="text-red-500 hover:text-red-600"
								onClick={clearHistory}
							>
								<Trash2 className="size-3.5" />
								清空历史
							</Button>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}
