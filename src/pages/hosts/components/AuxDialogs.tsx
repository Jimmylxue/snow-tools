import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { listHostsBackups, lookupHostsDomain } from '@/hooks/ipc/hosts'
import type {
	THostsBackupItem,
	THostsLookupResult,
	THostsSystemInfo,
} from 'electron/biz/hosts/type'

type TConfirmProps = {
	open: boolean
	title: string
	description: React.ReactNode
	confirmText?: string
	destructive?: boolean
	busy?: boolean
	onConfirm: () => void
	onOpenChange: (open: boolean) => void
}

export function ConfirmDialog({
	open,
	title,
	description,
	confirmText = '确认',
	destructive = false,
	busy = false,
	onConfirm,
	onOpenChange,
}: TConfirmProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[440px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription asChild>
						<div className="text-sm leading-relaxed text-muted-foreground">
							{description}
						</div>
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2 sm:space-x-0">
					<Button
						variant="outline"
						size="sm"
						disabled={busy}
						onClick={() => onOpenChange(false)}
					>
						取消
					</Button>
					<Button
						variant={destructive ? 'destructive' : 'default'}
						size="sm"
						disabled={busy}
						onClick={onConfirm}
					>
						{busy && <Loader2 className="size-3.5 animate-spin" />}
						{confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

type TNameProps = {
	open: boolean
	title: string
	initialValue: string
	onOpenChange: (open: boolean) => void
	onConfirm: (name: string) => void
}

export function NameDialog({
	open,
	title,
	initialValue,
	onOpenChange,
	onConfirm,
}: TNameProps) {
	const [value, setValue] = useState(initialValue)
	const [error, setError] = useState('')

	useEffect(() => {
		if (!open) return
		setValue(initialValue)
		setError('')
	}, [open, initialValue])

	const submit = () => {
		const name = value.trim()
		if (!name) {
			setError('方案名称不能为空')
			return
		}
		if (name.length > 40) {
			setError('方案名称不能超过 40 个字符')
			return
		}
		onConfirm(name)
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[400px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						方案用于快速切换整套 hosts 配置。
					</DialogDescription>
				</DialogHeader>
				<form
					className="space-y-2"
					onSubmit={event => {
						event.preventDefault()
						submit()
					}}
				>
					<Input
						autoFocus
						value={value}
						onChange={event => {
							setValue(event.target.value)
							setError('')
						}}
						placeholder="例如：本地开发"
						className="h-9 text-sm"
					/>
					{error && <p className="text-xs text-red-500">{error}</p>}
					<DialogFooter className="gap-2 pt-2 sm:space-x-0">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => onOpenChange(false)}
						>
							取消
						</Button>
						<Button type="submit" size="sm">
							保存
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

function formatSize(size: number) {
	if (size < 1024) return `${size} B`
	return `${(size / 1024).toFixed(1)} KB`
}

type TBackupsProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onRequestRestore: (item: THostsBackupItem) => void
}

export function BackupsDialog({
	open,
	onOpenChange,
	onRequestRestore,
}: TBackupsProps) {
	const [items, setItems] = useState<THostsBackupItem[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		if (!open) return

		setLoading(true)
		setError('')
		listHostsBackups()
			.then(setItems)
			.catch(() => setError('读取备份失败'))
			.finally(() => setLoading(false))
	}, [open])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[520px]">
				<DialogHeader>
					<DialogTitle>历史备份</DialogTitle>
					<DialogDescription>
						每次应用或还原前都会自动备份当前系统 hosts，最多保留 20 份。
					</DialogDescription>
				</DialogHeader>

				<div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
					{loading && (
						<div className="flex items-center justify-center py-10 text-slate-400">
							<Loader2 className="size-5 animate-spin" />
						</div>
					)}

					{!loading && error && (
						<p className="py-8 text-center text-sm text-red-500">{error}</p>
					)}

					{!loading && !error && items.length === 0 && (
						<p className="py-8 text-center text-sm text-slate-400">
							还没有备份，首次应用时会自动创建
						</p>
					)}

					{!loading &&
						!error &&
						items.map(item => (
							<div
								key={item.name}
								className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
									item.isOriginal
										? 'border-green-200 bg-green-50/60'
										: 'border-slate-200'
								}`}
							>
								<div className="min-w-0">
									<div className="text-sm font-medium text-slate-700">
										{item.isOriginal
											? '系统原始 hosts'
											: dayjs(item.mtimeMs).format('YYYY-MM-DD HH:mm:ss')}
									</div>
									<div className="text-[11px] text-slate-400">
										{item.isOriginal
											? '首次使用工具的记录，不会被自动清理'
											: `${formatSize(item.size)} · ${dayjs(item.mtimeMs).format('HH:mm:ss')}`}
									</div>
								</div>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onRequestRestore(item)}
								>
									还原
								</Button>
							</div>
						))}
				</div>
			</DialogContent>
		</Dialog>
	)
}

type TLookupProps = {
	open: boolean
	defaultDomain: string
	onOpenChange: (open: boolean) => void
}

export function LookupDialog({
	open,
	defaultDomain,
	onOpenChange,
}: TLookupProps) {
	const [domain, setDomain] = useState(defaultDomain)
	const [result, setResult] = useState<THostsLookupResult | null>(null)
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!open) return
		setDomain(defaultDomain)
		setResult(null)
	}, [open, defaultDomain])

	const lookup = async () => {
		if (!domain.trim()) return
		setLoading(true)
		setResult(null)
		try {
			setResult(await lookupHostsDomain(domain))
		} catch (error) {
			setResult({
				ok: false,
				message: error instanceof Error ? error.message : '解析失败',
			})
		} finally {
			setLoading(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[440px]">
				<DialogHeader>
					<DialogTitle>解析测试</DialogTitle>
					<DialogDescription>
						查询系统当前把域名解析到哪个 IP，可用于确认 hosts 是否生效。
					</DialogDescription>
				</DialogHeader>

				<form
					className="flex gap-2"
					onSubmit={event => {
						event.preventDefault()
						void lookup()
					}}
				>
					<Input
						autoFocus
						value={domain}
						onChange={event => {
							setDomain(event.target.value)
							setResult(null)
						}}
						placeholder="api.dev.local"
						className="h-9 font-mono text-sm"
					/>
					<Button type="submit" size="sm" disabled={loading}>
						{loading && <Loader2 className="size-3.5 animate-spin" />}
						解析
					</Button>
				</form>

				<div className="min-h-[72px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
					{!result && !loading && (
						<p className="text-xs text-slate-400">
							输入域名后点击解析。浏览器和系统可能还有额外缓存。
						</p>
					)}
					{result?.ok && (
						<div className="space-y-1">
							{result.addresses.map(item => (
								<div
									key={`${item.family}-${item.address}`}
									className="flex items-center justify-between font-mono text-xs"
								>
									<span className="text-slate-700">{item.address}</span>
									<span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
										{item.family === 6 ? 'IPv6' : 'IPv4'}
									</span>
								</div>
							))}
						</div>
					)}
					{result && !result.ok && (
						<p className="text-xs text-red-500">{result.message}</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}

type TSystemFileProps = {
	open: boolean
	system: THostsSystemInfo | null
	onOpenChange: (open: boolean) => void
	onRefresh: () => Promise<void>
}

export function SystemFileDialog({
	open,
	system,
	onOpenChange,
	onRefresh,
}: TSystemFileProps) {
	const [refreshing, setRefreshing] = useState(false)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[620px]">
				<DialogHeader>
					<DialogTitle>系统 hosts 文件</DialogTitle>
					<DialogDescription className="break-all font-mono text-xs">
						{system?.path ?? '读取中…'}
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center justify-between text-xs text-slate-500">
					<span>
						{system?.mtimeMs
							? `最后修改：${dayjs(system.mtimeMs).format('YYYY-MM-DD HH:mm:ss')}`
							: '文件不存在'}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={refreshing}
						onClick={async () => {
							setRefreshing(true)
							try {
								await onRefresh()
							} finally {
								setRefreshing(false)
							}
						}}
					>
						<RefreshCw
							className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`}
						/>
						重新读取
					</Button>
				</div>

				<pre className="max-h-[340px] overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
					{system?.content || '（空文件）'}
				</pre>

				<p className="text-[11px] text-slate-400">
					直接在系统文件中修改的内容，会在应用 SnowTools 配置时被覆盖。
				</p>
			</DialogContent>
		</Dialog>
	)
}
