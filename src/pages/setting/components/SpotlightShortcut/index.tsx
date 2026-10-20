import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import {
	getSpotlightShortcutState,
	setSpotlightShortcutDisabled,
} from '@/hooks/ipc/spotlight'

export function SpotlightShortcut() {
	const isMac = navigator.platform.includes('Mac')
	const [disabled, setDisabled] = useState(false)
	const [available, setAvailable] = useState(false)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [message, setMessage] = useState('')

	useEffect(() => {
		if (!isMac) {
			setLoading(false)
			return
		}

		let cancelled = false
		getSpotlightShortcutState()
			.then(state => {
				if (cancelled) return
				setAvailable(state.available)
				setDisabled(state.disabled)
				setMessage(state.message ?? '')
			})
			.catch(error => {
				if (cancelled) return
				setAvailable(false)
				setMessage(
					error instanceof Error
						? error.message
						: '读取系统快捷键状态失败',
				)
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [isMac])

	if (!isMac) return null

	const handleChange = async (next: boolean) => {
		setSaving(true)
		try {
			const result = await setSpotlightShortcutDisabled(next)
			if (!result.ok) {
				toast.error(result.message ?? '修改聚焦搜索快捷键失败')
				return
			}

			setDisabled(result.disabled ?? next)
			toast.success(
				result.disabled
					? '已关闭系统聚焦搜索快捷键'
					: '已恢复系统聚焦搜索快捷键',
				{
					description: result.disabled
						? '⌘Space 已释放，可在上方把「启动指令」设为 ⌘Space'
						: '⌘Space 将重新用于聚焦搜索',
				},
			)
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: '修改聚焦搜索快捷键失败',
			)
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="flex items-center justify-between gap-4 py-3">
			<div className="min-w-0">
				<div className="text-sm font-medium text-slate-800">
					释放系统 ⌘Space
				</div>
				<div
					className="mt-0.5 text-xs text-slate-400"
					title={message || undefined}
				>
					{loading
						? '正在读取系统状态…'
						: available
							? '关闭 macOS 聚焦搜索的快捷键，让 SnowTools 可以使用 ⌘Space'
							: '当前无法读取系统快捷键状态'}
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				{(loading || saving) && (
					<Loader2 className="size-3.5 animate-spin text-slate-400" />
				)}
				<Switch
					checked={disabled}
					disabled={loading || saving || !available}
					label="关闭系统聚焦搜索快捷键"
					onChange={value => void handleChange(value)}
				/>
			</div>
		</div>
	)
}
