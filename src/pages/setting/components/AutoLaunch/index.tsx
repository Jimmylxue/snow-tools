import { useCallback, useEffect, useState } from 'react'
import { Loader2, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import {
	getAutoLaunchState,
	openAutoLaunchSettings,
	setAutoLaunch,
} from '@/hooks/ipc/autoLaunch'
import type { TAutoLaunchState } from 'electron/biz/autoLaunch/type'

export function AutoLaunch() {
	const [state, setState] = useState<TAutoLaunchState | null>(null)
	const [loading, setLoading] = useState(true)
	const [busy, setBusy] = useState(false)

	const load = useCallback(async (silent = false) => {
		if (!silent) setLoading(true)

		try {
			setState(await getAutoLaunchState())
		} catch {
			setState({
				available: false,
				enabled: false,
				isPackaged: false,
				status: null,
				reason: '读取开机自启状态失败',
			})
		} finally {
			if (!silent) setLoading(false)
		}
	}, [])

	useEffect(() => {
		void load()
	}, [load])

	/** 用户可能去系统设置里允许登录项，回到窗口时重新读一次状态 */
	useEffect(() => {
		const handleFocus = () => {
			void load(true)
		}

		window.addEventListener('focus', handleFocus)
		return () => window.removeEventListener('focus', handleFocus)
	}, [load])

	const openSettings = async () => {
		try {
			await openAutoLaunchSettings()
		} catch {
			toast.error('打开系统设置失败')
		}
	}

	const apply = async (enabled: boolean) => {
		if (!state?.available || busy) return

		setBusy(true)
		try {
			const result = await setAutoLaunch(enabled)
			if (!result.ok) {
				toast.error(result.message)
				return
			}

			setState(result.state)

			if (enabled && result.state.status === 'requires-approval') {
				toast('已加入登录项，还需在系统设置的「登录项」中允许')
				return
			}

			toast.success(enabled ? '已开启开机自启' : '已关闭开机自启')
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : '设置开机自启失败',
			)
		} finally {
			setBusy(false)
		}
	}

	const getDescription = () => {
		if (loading) return '正在读取系统设置…'
		if (!state) return '读取开机自启状态失败'
		if (!state.available) {
			return state.reason ?? '当前环境不支持设置开机自启'
		}
		if (state.status === 'requires-approval') {
			return '已在系统登录项中注册，需要允许后才会生效'
		}
		if (state.enabled) {
			return '登录系统后自动在后台启动，不弹出启动器'
		}
		return '登录系统时自动启动 SnowTools，并在后台运行'
	}

	return (
		<div className="flex items-center justify-between gap-4 py-3">
			<div className="min-w-0">
				<div className="flex items-center gap-2 text-sm font-medium text-slate-800">
					开机自启
					{loading && (
						<Loader2 className="size-3 animate-spin text-slate-400" />
					)}
				</div>
				<p className="mt-0.5 text-xs leading-relaxed text-slate-400">
					{getDescription()}
				</p>
				{state?.available &&
					state.status === 'requires-approval' && (
						<button
							type="button"
							className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
							onClick={() => void openSettings()}
						>
							<Settings2 className="size-3" />
							去系统设置允许
						</button>
					)}
			</div>

			<Switch
				checked={state?.enabled ?? false}
				disabled={loading || busy || !state?.available}
				onChange={enabled => void apply(enabled)}
				label="开机自启"
			/>
		</div>
	)
}
