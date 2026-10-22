import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	clearBaiduTranslateConfig,
	getBaiduTranslateConfig,
	saveBaiduTranslateConfig,
} from '@/hooks/ipc/translate'

export function BaiduTranslate() {
	const [appId, setAppId] = useState('')
	const [secret, setSecret] = useState('')
	const [configured, setConfigured] = useState(false)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		let cancelled = false

		getBaiduTranslateConfig()
			.then(state => {
				if (cancelled) return
				setAppId(state.appId)
				setConfigured(state.configured)
			})
			.catch(() => {
				if (!cancelled) toast.error('读取翻译配置失败')
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [])

	const handleSave = async () => {
		if (!appId.trim()) {
			toast.error('请输入百度翻译 AppID')
			return
		}
		if (!configured && !secret.trim()) {
			toast.error('请输入百度翻译密钥')
			return
		}

		setSaving(true)
		try {
			const result = await saveBaiduTranslateConfig({
				appId: appId.trim(),
				secret: secret.trim(),
			})
			if (!result.ok) {
				toast.error(result.message ?? '保存翻译配置失败')
				return
			}

			setConfigured(true)
			setSecret('')
			toast.success('翻译配置已保存')
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: '保存翻译配置失败',
			)
		} finally {
			setSaving(false)
		}
	}

	const handleClear = async () => {
		setSaving(true)
		try {
			const result = await clearBaiduTranslateConfig()
			if (!result.ok) {
				toast.error(result.message ?? '清除翻译配置失败')
				return
			}

			setAppId('')
			setSecret('')
			setConfigured(false)
			toast.success('已清除本机翻译配置')
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: '清除翻译配置失败',
			)
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-3 py-3">
			<div className="space-y-1.5">
				<label
					htmlFor="baidu-translate-appid"
					className="text-xs font-medium text-slate-600"
				>
					AppID
				</label>
				<Input
					id="baidu-translate-appid"
					value={appId}
					onChange={event => setAppId(event.target.value)}
					placeholder="百度翻译开放平台的 AppID"
					autoComplete="off"
					className="h-9 text-sm"
					disabled={loading || saving}
				/>
			</div>

			<div className="space-y-1.5">
				<label
					htmlFor="baidu-translate-secret"
					className="text-xs font-medium text-slate-600"
				>
					密钥
				</label>
				<Input
					id="baidu-translate-secret"
					type="password"
					value={secret}
					onChange={event => setSecret(event.target.value)}
					placeholder={
						configured
							? '已保存，留空则不修改'
							: '百度翻译开放平台的密钥'
					}
					autoComplete="off"
					className="h-9 text-sm"
					disabled={loading || saving}
				/>
			</div>

			<div className="flex items-center justify-between gap-3">
				<p className="min-w-0 text-[11px] text-slate-400">
					{configured
						? '已配置，翻译将直接调用百度。密钥仅保存在本机。'
						: '未配置时，翻译会提示先填写 AppID 和密钥。'}
				</p>

				<div className="flex shrink-0 items-center gap-2">
					{(loading || saving) && (
						<Loader2 className="size-3.5 animate-spin text-slate-400" />
					)}
					{configured && (
						<Button
							variant="ghost"
							size="sm"
							className="text-red-500 hover:text-red-600"
							disabled={loading || saving}
							onClick={() => void handleClear()}
						>
							清除
						</Button>
					)}
					<Button
						size="sm"
						disabled={
							loading ||
							saving ||
							!appId.trim() ||
							(!configured && !secret.trim())
						}
						onClick={() => void handleSave()}
					>
						保存
					</Button>
				</div>
			</div>
		</div>
	)
}
