import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import {
	Copy,
	Download,
	FileText,
	FlaskConical,
	Globe2,
	History,
	Loader2,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import {
	applyHostsToSystem,
	exportHostsFile,
	flushHostsDns,
	getHostsState,
	getSystemHosts,
	importHostsFile,
	restoreHostsBackup,
	saveHostsState,
} from '@/hooks/ipc/hosts'
import type {
	THostsBackupItem,
	THostsEntry,
	THostsMeta,
	THostsProfile,
	THostsState,
	THostsSystemInfo,
} from 'electron/biz/hosts/type'
import HostsSvg from '@/assets/img/tool-hosts.svg'
import { EntryDialog } from './components/EntryDialog'
import {
	BackupsDialog,
	ConfirmDialog,
	LookupDialog,
	NameDialog,
	SystemFileDialog,
} from './components/AuxDialogs'
import { Switch } from '@/components/ui/switch'

type TConfirmState =
	| { type: 'deleteProfile'; profileId: string; name: string }
	| { type: 'overwriteSystem' }
	| { type: 'restore'; item: THostsBackupItem }
	| { type: 'import'; fileName: string; entries: THostsEntry[] }
	| { type: 'emptyApply' }

export function Hosts() {
	const [state, setState] = useState<THostsState | null>(null)
	const [meta, setMeta] = useState<THostsMeta | null>(null)
	const [system, setSystem] = useState<THostsSystemInfo | null>(null)
	const [pending, setPending] = useState(false)
	const [drift, setDrift] = useState(false)
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState('')
	const [busy, setBusy] = useState<'apply' | 'flush' | 'restore' | null>(null)
	const [search, setSearch] = useState('')
	const [entryDialog, setEntryDialog] = useState<{
		open: boolean
		entry: THostsEntry | null
	}>({ open: false, entry: null })
	const [renameOpen, setRenameOpen] = useState(false)
	const [backupsOpen, setBackupsOpen] = useState(false)
	const [lookupOpen, setLookupOpen] = useState(false)
	const [systemOpen, setSystemOpen] = useState(false)
	const [confirm, setConfirm] = useState<TConfirmState | null>(null)
	const loadedRef = useRef(false)

	const load = useCallback(async (silent = false) => {
		if (!silent) setLoading(true)
		setLoadError('')

		try {
			const response = await getHostsState()
			setState(response.state)
			setMeta(response.meta)
			setSystem(response.system)
			setPending(response.pending)
			setDrift(response.drift)
			loadedRef.current = true
		} catch (error) {
			setLoadError(
				error instanceof Error ? error.message : '读取系统 hosts 失败',
			)
		} finally {
			if (!silent) setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	/** 窗口隐藏期间系统文件可能被改过，重新展示时静默同步一次 */
	useEffect(() => {
		const handleShown = () => {
			void load(true)
		}

		window.ipcRenderer.on('HOSTS_WINDOW_SHOWN', handleShown)
		return () => {
			window.ipcRenderer.off('HOSTS_WINDOW_SHOWN', handleShown)
		}
	}, [load])

	/** 编辑只落在应用内，频繁但数据很小，直接串行保存即可 */
	useEffect(() => {
		if (!state || !loadedRef.current) return

		void saveHostsState(state)
			.then(result => {
				if (!result.ok) {
					toast.error(result.message ?? '保存 Hosts 配置失败')
				}
			})
			.catch(() => {
				toast.error('保存 Hosts 配置失败')
			})
	}, [state])

	const profile = useMemo(() => {
		if (!state) return null
		return (
			state.profiles.find(item => item.id === state.activeProfileId) ??
			state.profiles[0]
		)
	}, [state])

	const updateProfile = useCallback(
		(updater: (profile: THostsProfile) => THostsProfile) => {
			setState(previous => {
				if (!previous) return previous

				return {
					...previous,
					profiles: previous.profiles.map(item =>
						item.id === previous.activeProfileId
							? { ...updater(item), updatedAt: Date.now() }
							: item,
					),
				}
			})
			setPending(true)
		},
		[],
	)

	const toggleAutoFlush = (enabled: boolean) => {
		setState(previous =>
			previous
				? {
						...previous,
						settings: { ...previous.settings, autoFlush: enabled },
					}
				: previous,
		)
	}

	const switchProfile = (profileId: string) => {
		setState(previous =>
			previous ? { ...previous, activeProfileId: profileId } : previous,
		)
		setPending(true)
		setSearch('')
		toast('已切换方案，点击「应用」写入系统')
	}

	const createProfile = () => {
		if (!state) return

		let index = state.profiles.length + 1
		while (state.profiles.some(item => item.name === `新方案 ${index}`)) {
			index += 1
		}

		const nextProfile: THostsProfile = {
			id: uuidv4(),
			name: `新方案 ${index}`,
			entries: [],
			updatedAt: Date.now(),
		}

		setState({
			...state,
			profiles: [...state.profiles, nextProfile],
			activeProfileId: nextProfile.id,
		})
		setPending(true)
		setSearch('')
	}

	const duplicateProfile = () => {
		if (!state || !profile) return

		const copy: THostsProfile = {
			id: uuidv4(),
			name: `${profile.name} 副本`,
			entries: profile.entries.map(entry => ({
				...entry,
				id: uuidv4(),
				domains: [...entry.domains],
			})),
			updatedAt: Date.now(),
		}

		setState({
			...state,
			profiles: [...state.profiles, copy],
			activeProfileId: copy.id,
		})
		setPending(true)
		setSearch('')
	}

	const renameProfile = (name: string) => {
		if (!profile) return

		setState(previous =>
			previous
				? {
						...previous,
						profiles: previous.profiles.map(item =>
							item.id === profile.id
								? { ...item, name, updatedAt: Date.now() }
								: item,
						),
					}
				: previous,
		)
		setRenameOpen(false)
	}

	const deleteProfile = () => {
		if (!state || confirm?.type !== 'deleteProfile') return

		const profiles = state.profiles.filter(
			item => item.id !== confirm.profileId,
		)
		if (!profiles.length) return

		setState({
			...state,
			profiles,
			activeProfileId: profiles.some(
				item => item.id === state.activeProfileId,
			)
				? state.activeProfileId
				: profiles[0].id,
		})
		setConfirm(null)
		setPending(true)
	}

	const toggleEntry = (entryId: string, enabled: boolean) => {
		updateProfile(item => ({
			...item,
			entries: item.entries.map(entry =>
				entry.id === entryId ? { ...entry, enabled } : entry,
			),
		}))
	}

	const submitEntry = (entry: THostsEntry) => {
		const editing = !!entryDialog.entry

		updateProfile(item => ({
			...item,
			entries: editing
				? item.entries.map(current =>
						current.id === entry.id ? entry : current,
					)
				: [...item.entries, entry],
		}))
		setEntryDialog({ open: false, entry: null })
		toast.success(editing ? '条目已更新' : '条目已添加')
	}

	const deleteEntry = (entry: THostsEntry) => {
		updateProfile(item => ({
			...item,
			entries: item.entries.filter(current => current.id !== entry.id),
		}))
		toast.success('条目已删除，应用后生效')
	}

	const runApply = async (force = false, allowEmpty = false) => {
		if (!state || !profile || !system) return

		if (!allowEmpty && !profile.entries.some(entry => entry.enabled)) {
			setConfirm({ type: 'emptyApply' })
			return
		}

		setBusy('apply')
		try {
			const result = await applyHostsToSystem({
				profileId: profile.id,
				profileName: profile.name,
				entries: profile.entries,
				expectedSystemHash: system.hash,
				force,
				flush: state.settings.autoFlush,
			})

			if (!result.ok) {
				if (result.code === 'EXTERNAL_CHANGE') {
					if (result.system) setSystem(result.system)
					setConfirm({ type: 'overwriteSystem' })
					return
				}
				if (result.code === 'VALIDATION') {
					toast.error(
						result.errors?.[0]?.message ?? result.message,
					)
					return
				}
				if (result.code === 'CANCELLED') {
					toast('已取消管理员授权')
					return
				}
				toast.error(result.message)
				return
			}

			setSystem(result.system)
			setMeta(previous =>
				previous
					? {
							...previous,
							lastAppliedSignature: result.appliedSignature,
							lastAppliedAt: result.appliedAt,
							lastFlushAt: result.flushed
								? result.appliedAt
								: previous.lastFlushAt,
						}
					: previous,
			)
			setPending(false)
			setDrift(false)
			toast.success(
				result.flushed
					? '已写入系统 hosts，并刷新了 DNS 缓存'
					: '已写入系统 hosts',
			)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : '应用失败')
		} finally {
			setBusy(null)
		}
	}

	const runFlush = async () => {
		setBusy('flush')
		try {
			const result = await flushHostsDns()
			if (!result.ok) {
				toast(
					result.code === 'CANCELLED'
						? '已取消管理员授权'
						: result.message,
				)
				return
			}
			setMeta(previous =>
				previous
					? { ...previous, lastFlushAt: result.flushedAt }
					: previous,
			)
			toast.success('DNS 缓存已刷新')
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : '刷新 DNS 缓存失败',
			)
		} finally {
			setBusy(null)
		}
	}

	const requestRestore = (item: THostsBackupItem) => {
		setBackupsOpen(false)
		setConfirm({ type: 'restore', item })
	}

	const runRestore = async () => {
		if (confirm?.type !== 'restore' || !state) return

		setBusy('restore')
		try {
			const result = await restoreHostsBackup(
				confirm.item.name,
				state.settings.autoFlush,
			)
			if (!result.ok) {
				toast(
					result.code === 'CANCELLED'
						? '已取消管理员授权'
						: result.message,
				)
				return
			}

			setSystem(result.system)
			setMeta(previous =>
				previous
					? {
							...previous,
							lastAppliedSignature: result.restoredSignature,
							lastAppliedAt: Date.now(),
							lastFlushAt: result.flushed
								? Date.now()
								: previous.lastFlushAt,
						}
					: previous,
			)
			setConfirm(null)
			setDrift(false)
			/** 应用内方案与刚还原的文件不一定一致，保留待应用提示 */
			setPending(true)
			toast.success('已还原系统 hosts，应用内配置尚未应用')
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : '还原失败',
			)
		} finally {
			setBusy(null)
		}
	}

	const requestImport = async () => {
		try {
			const result = await importHostsFile()
			if (result.canceled) return
			if (!result.entries.length) {
				toast('文件中没有可导入的 hosts 条目')
				return
			}
			setConfirm({
				type: 'import',
				fileName: result.fileName,
				entries: result.entries,
			})
		} catch (error) {
			toast.error(error instanceof Error ? error.message : '导入失败')
		}
	}

	const confirmImport = () => {
		if (confirm?.type !== 'import' || !profile) return

		const familyOf = (ip: string) => (ip.includes(':') ? 6 : 4)
		const blocked = new Set(
			profile.entries.flatMap(entry =>
				entry.domains.map(
					domain =>
						`${familyOf(entry.ip)}:${domain.toLowerCase()}`,
				),
			),
		)
		const entries = [...profile.entries]
		let skipped = 0

		for (const entry of confirm.entries) {
			const family = familyOf(entry.ip)
			const domains = entry.domains.filter(
				domain =>
					!blocked.has(`${family}:${domain.toLowerCase()}`),
			)
			if (!domains.length) {
				skipped += 1
				continue
			}

			domains.forEach(domain =>
				blocked.add(`${family}:${domain.toLowerCase()}`),
			)
			entries.push({ ...entry, domains })
		}

		updateProfile(item => ({ ...item, entries }))
		setConfirm(null)
		toast.success(
			`已导入 ${confirm.entries.length - skipped} 条${
				skipped ? `，跳过 ${skipped} 条重复域名` : ''
			}`,
		)
	}

	const runExport = async () => {
		if (!profile) return

		try {
			const result = await exportHostsFile(profile.name, profile.entries)
			if (result.canceled) return
			toast.success(`已导出到 ${result.filePath}`)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : '导出失败')
		}
	}

	const refreshSystemFile = async () => {
		try {
			const info = await getSystemHosts()
			setSystem(info)
			if (meta) {
				setDrift(
					meta.lastAppliedSignature !== null &&
						info.signature !== meta.lastAppliedSignature,
				)
			}
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : '读取系统 hosts 失败',
			)
		}
	}

	const filteredEntries = useMemo(() => {
		if (!profile) return []

		const keyword = search.trim().toLowerCase()
		if (!keyword) return profile.entries

		return profile.entries.filter(
			entry =>
				entry.ip.toLowerCase().includes(keyword) ||
				entry.comment.toLowerCase().includes(keyword) ||
				entry.domains.some(domain =>
					domain.toLowerCase().includes(keyword),
				),
		)
	}, [profile, search])

	const defaultLookupDomain = useMemo(() => {
		const entry = profile?.entries.find(
			item => item.enabled && item.domains.length,
		)
		return entry?.domains[0] ?? ''
	}, [profile])

	if (loading) {
		return (
			<div className="flex h-screen flex-col items-center justify-center gap-2 bg-white text-sm text-slate-400">
				<Loader2 className="size-5 animate-spin" />
				正在读取系统 hosts…
			</div>
		)
	}

	if (loadError || !state || !profile) {
		return (
			<div className="flex h-screen flex-col items-center justify-center gap-3 bg-white">
				<p className="text-sm text-slate-500">
					{loadError || '读取 Hosts 配置失败'}
				</p>
				<Button variant="outline" size="sm" onClick={() => void load()}>
					重试
				</Button>
			</div>
		)
	}

	const canApply = (pending || drift) && busy === null

	return (
		<div className="flex h-screen w-screen flex-col bg-white text-slate-800">
			<header className="flex items-center justify-between border-b border-slate-100 px-5 pb-3 pt-4">
				<div className="flex items-center gap-3">
					<img src={HostsSvg} className="size-9" alt="Hosts" />
					<div>
						<h1 className="text-base font-semibold">Hosts 管理</h1>
						<p className="text-xs text-slate-500">
							切换本地 hosts 配置，并在应用后刷新 DNS 缓存
						</p>
					</div>
				</div>

				<div className="flex items-center gap-1.5">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setLookupOpen(true)}
					>
						<FlaskConical />
						解析测试
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setSystemOpen(true)}
					>
						<FileText />
						系统文件
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={busy !== null}
						onClick={() => void runFlush()}
					>
						<RefreshCw
							className={busy === 'flush' ? 'animate-spin' : ''}
						/>
						刷新缓存
					</Button>
				</div>
			</header>

			<div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
				<Select
					value={state.activeProfileId}
					onValueChange={switchProfile}
				>
					<SelectTrigger className="h-8 w-[200px] text-xs">
						<SelectValue placeholder="选择方案" />
					</SelectTrigger>
					<SelectContent>
						{state.profiles.map(item => (
							<SelectItem
								key={item.id}
								value={item.id}
								className="text-xs"
							>
								{item.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					title="新建方案"
					onClick={createProfile}
				>
					<Plus className="size-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					title="复制当前方案"
					onClick={duplicateProfile}
				>
					<Copy className="size-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="size-8"
					title="重命名当前方案"
					onClick={() => setRenameOpen(true)}
				>
					<Pencil className="size-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					className="size-8 text-red-500 hover:text-red-600"
					title="删除当前方案"
					disabled={state.profiles.length <= 1}
					onClick={() =>
						setConfirm({
							type: 'deleteProfile',
							profileId: profile.id,
							name: profile.name,
						})
					}
				>
					<Trash2 className="size-3.5" />
				</Button>

				<div className="ml-auto flex items-center gap-1.5 text-xs">
					{drift ? (
						<span className="text-amber-600">
							● 系统文件已被外部修改
						</span>
					) : pending ? (
						<span className="text-amber-600">● 有未应用的修改</span>
					) : (
						<span className="text-green-600">● 已与系统一致</span>
					)}
				</div>
			</div>

			{drift && (
				<div className="mx-5 mt-2 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
					<span>
						检测到系统 hosts 被其它程序修改，应用当前方案会覆盖这些改动。
					</span>
					<button
						type="button"
						className="shrink-0 underline underline-offset-2"
						onClick={() => setSystemOpen(true)}
					>
						查看系统文件
					</button>
				</div>
			)}

			<div className="flex items-center gap-2 px-5 py-3">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
					<Input
						value={search}
						onChange={event => setSearch(event.target.value)}
						placeholder="搜索 IP、域名或备注"
						className="h-9 pl-8 text-sm"
					/>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void requestImport()}
				>
					<Upload className="size-3.5" />
					导入
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void runExport()}
				>
					<Download className="size-3.5" />
					导出
				</Button>
				<Button
					size="sm"
					onClick={() =>
						setEntryDialog({ open: true, entry: null })
					}
				>
					<Plus className="size-3.5" />
					新增条目
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto px-5 pb-4">
				{filteredEntries.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
						<Globe2 className="size-10" />
						<p className="text-sm">
							{search.trim()
								? '没有匹配的条目'
								: '当前方案还没有条目'}
						</p>
						{!search.trim() && (
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									setEntryDialog({ open: true, entry: null })
								}
							>
								<Plus className="size-3.5" />
								新增条目
							</Button>
						)}
					</div>
				) : (
					<div className="space-y-2">
						{filteredEntries.map(entry => (
							<div
								key={entry.id}
								className={`group flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
									entry.enabled
										? 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/30'
										: 'border-slate-100 bg-slate-50/40'
								}`}
							>
								<Switch
									checked={entry.enabled}
									onChange={enabled =>
										toggleEntry(entry.id, enabled)
									}
									label="启用条目"
								/>

								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-x-2 gap-y-1">
										<span
											className={`font-mono text-sm font-medium ${
												entry.enabled
													? 'text-slate-800'
													: 'text-slate-400'
											}`}
										>
											{entry.ip}
										</span>
										<span className="flex flex-wrap gap-1">
											{entry.domains.map(domain => (
												<span
													key={domain}
													className={`rounded px-1.5 py-0.5 font-mono text-[11px] ${
														entry.enabled
															? 'bg-slate-100 text-slate-600'
															: 'bg-slate-100/60 text-slate-400'
													}`}
												>
													{domain}
												</span>
											))}
										</span>
									</div>
									{entry.comment && (
										<div className="mt-1 text-xs text-slate-400">
											{entry.comment}
										</div>
									)}
								</div>

								<div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
									<Button
										variant="ghost"
										size="icon"
										className="size-7"
										title="编辑"
										onClick={() =>
											setEntryDialog({
												open: true,
												entry,
											})
										}
									>
										<Pencil className="size-3.5" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="size-7 text-red-500 hover:text-red-600"
										title="删除"
										onClick={() => deleteEntry(entry)}
									>
										<Trash2 className="size-3.5" />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			<footer className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
				<div className="flex items-center gap-4 text-xs text-slate-400">
					<label className="flex cursor-pointer items-center gap-1.5 text-slate-500">
						<input
							type="checkbox"
							className="size-3.5 accent-blue-500"
							checked={state.settings.autoFlush}
							onChange={event =>
								toggleAutoFlush(event.target.checked)
							}
						/>
						应用后刷新缓存
					</label>
					{meta?.lastAppliedAt && (
						<span>
							上次应用：
							{dayjs(meta.lastAppliedAt).format('MM-DD HH:mm')}
						</span>
					)}
					{meta?.lastFlushAt && (
						<span>
							上次刷新：
							{dayjs(meta.lastFlushAt).format('MM-DD HH:mm')}
						</span>
					)}
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setBackupsOpen(true)}
					>
						<History className="size-3.5" />
						历史备份
					</Button>
					<Button
						size="sm"
						disabled={!canApply}
						onClick={() => void runApply()}
					>
						{busy === 'apply' && (
							<Loader2 className="size-3.5 animate-spin" />
						)}
						{busy === 'apply' ? '等待授权…' : '应用'}
					</Button>
				</div>
			</footer>

			<EntryDialog
				open={entryDialog.open}
				entry={entryDialog.entry}
				entries={profile.entries}
				onOpenChange={open =>
					setEntryDialog(previous => ({ ...previous, open }))
				}
				onSubmit={submitEntry}
			/>

			<NameDialog
				open={renameOpen}
				title="重命名方案"
				initialValue={profile.name}
				onOpenChange={setRenameOpen}
				onConfirm={renameProfile}
			/>

			<BackupsDialog
				open={backupsOpen}
				onOpenChange={setBackupsOpen}
				onRequestRestore={requestRestore}
			/>

			<LookupDialog
				open={lookupOpen}
				defaultDomain={defaultLookupDomain}
				onOpenChange={setLookupOpen}
			/>

			<SystemFileDialog
				open={systemOpen}
				system={system}
				onOpenChange={setSystemOpen}
				onRefresh={refreshSystemFile}
			/>

			<ConfirmDialog
				open={confirm?.type === 'deleteProfile'}
				title="删除方案"
				description={
					confirm?.type === 'deleteProfile'
						? `确定删除方案「${confirm.name}」吗？只会删除应用内配置，不会修改系统 hosts。`
						: ''
				}
				confirmText="删除"
				destructive
				onOpenChange={open => {
					if (!open) setConfirm(null)
				}}
				onConfirm={deleteProfile}
			/>

			<ConfirmDialog
				open={confirm?.type === 'overwriteSystem'}
				title="系统 hosts 已被修改"
				description="在你打开面板期间，系统 hosts 被其它程序改动了。继续应用会用当前方案覆盖这些改动，覆盖前会自动备份当前文件。"
				confirmText="仍然应用"
				destructive
				onOpenChange={open => {
					if (!open) setConfirm(null)
				}}
				onConfirm={() => {
					setConfirm(null)
					void runApply(true)
				}}
			/>

			<ConfirmDialog
				open={confirm?.type === 'restore'}
				title={
					confirm?.type === 'restore' && confirm.item.isOriginal
						? '恢复系统原始 hosts'
						: '还原历史备份'
				}
				description={
					confirm?.type === 'restore'
						? `将使用${
								confirm.item.isOriginal
									? '首次使用 SnowTools 时记录的系统原始内容'
									: ` ${dayjs(confirm.item.mtimeMs).format(
											'YYYY-MM-DD HH:mm:ss',
										)} 的备份`
							}覆盖当前系统 hosts，当前文件会先自动备份。`
						: ''
				}
				confirmText="还原"
				destructive
				busy={busy === 'restore'}
				onOpenChange={open => {
					if (!open) setConfirm(null)
				}}
				onConfirm={() => void runRestore()}
			/>

			<ConfirmDialog
				open={confirm?.type === 'emptyApply'}
				title="当前没有任何启用条目"
				description="应用后系统 hosts 只会保留 SnowTools 的注释头，原有的 localhost 等映射也会被清空。确定继续吗？"
				confirmText="仍然应用"
				destructive
				onOpenChange={open => {
					if (!open) setConfirm(null)
				}}
				onConfirm={() => {
					setConfirm(null)
					void runApply(false, true)
				}}
			/>

			<ConfirmDialog
				open={confirm?.type === 'import'}
				title="导入 hosts 条目"
				description={
					confirm?.type === 'import'
						? `从「${confirm.fileName}」解析到 ${confirm.entries.length} 条记录，将追加到当前方案，域名重复的条目会自动跳过。`
						: ''
				}
				confirmText="导入"
				onOpenChange={open => {
					if (!open) setConfirm(null)
				}}
				onConfirm={confirmImport}
			/>
		</div>
	)
}
