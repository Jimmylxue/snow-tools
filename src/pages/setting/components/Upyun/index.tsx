import { useEffect, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	clearUpyunConfig,
	getUpyunConfig,
	saveUpyunConfig,
} from '@/hooks/ipc/upyun'

function Field({
	label,
	htmlFor,
	hint,
	children,
}: {
	label: string
	htmlFor: string
	hint?: string
	children: ReactNode
}) {
	return (
		<div className="space-y-1.5">
			<label
				htmlFor={htmlFor}
				className="text-xs font-medium text-slate-600"
			>
				{label}
			</label>
			{children}
			{hint && (
				<p className="text-[11px] leading-relaxed text-slate-400">
					{hint}
				</p>
			)}
		</div>
	)
}

export function UpyunSettings() {
	const [bucket, setBucket] = useState('')
	const [operator, setOperator] = useState('')
	const [secret, setSecret] = useState('')
	const [domain, setDomain] = useState('')
	const [directory, setDirectory] = useState('snowtools')
	const [configured, setConfigured] = useState(false)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		let cancelled = false

		getUpyunConfig()
			.then(state => {
				if (cancelled) return
				setBucket(state.bucket)
				setOperator(state.operator)
				setDomain(state.domain)
				setDirectory(state.directory)
				setConfigured(state.configured)
			})
			.catch(() => {
				if (!cancelled) toast.error('读取图床配置失败')
			})
			.finally(() => {
				if (!cancelled) setLoading(false)
			})

		return () => {
			cancelled = true
		}
	}, [])

	const handleSave = async () => {
		if (!bucket.trim()) {
			toast.error('请输入又拍云服务名')
			return
		}
		if (!operator.trim()) {
			toast.error('请输入操作员名称')
			return
		}
		if (!configured && !secret.trim()) {
			toast.error('请输入操作员密码')
			return
		}

		setSaving(true)
		try {
			const result = await saveUpyunConfig({
				bucket: bucket.trim(),
				operator: operator.trim(),
				secret: secret.trim(),
				domain: domain.trim(),
				directory: directory.trim(),
			})
			if (!result.ok) {
				toast.error(result.message ?? '保存图床配置失败')
				return
			}

			const state = await getUpyunConfig()
			setBucket(state.bucket)
			setOperator(state.operator)
			setDomain(state.domain)
			setDirectory(state.directory)
			setConfigured(state.configured)
			setSecret('')
			toast.success('图床配置已保存')
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: '保存图床配置失败',
			)
		} finally {
			setSaving(false)
		}
	}

	const handleClear = async () => {
		setSaving(true)
		try {
			const result = await clearUpyunConfig()
			if (!result.ok) {
				toast.error(result.message ?? '清除图床配置失败')
				return
			}

			setBucket('')
			setOperator('')
			setSecret('')
			setDomain('')
			setDirectory('snowtools')
			setConfigured(false)
			toast.success('已清除本机图床配置')
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: '清除图床配置失败',
			)
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-4 py-3">
			<div className="grid grid-cols-2 gap-3">
				<Field label="服务名" htmlFor="upyun-bucket">
					<Input
						id="upyun-bucket"
						value={bucket}
						onChange={event => setBucket(event.target.value)}
						placeholder="例如 my-bucket"
						autoComplete="off"
						className="h-9 text-sm"
						disabled={loading || saving}
					/>
				</Field>
				<Field label="操作员" htmlFor="upyun-operator">
					<Input
						id="upyun-operator"
						value={operator}
						onChange={event => setOperator(event.target.value)}
						placeholder="又拍云操作员名称"
						autoComplete="off"
						className="h-9 text-sm"
						disabled={loading || saving}
					/>
				</Field>
			</div>

			<Field label="操作员密码" htmlFor="upyun-secret">
				<Input
					id="upyun-secret"
					type="password"
					value={secret}
					onChange={event => setSecret(event.target.value)}
					placeholder={
						configured
							? '已保存，留空则不修改'
							: '又拍云操作员密码'
					}
					autoComplete="off"
					className="h-9 text-sm"
					disabled={loading || saving}
				/>
			</Field>

			<Field
				label="访问域名（可选）"
				htmlFor="upyun-domain"
				hint="留空则使用 https://<服务名>.b0.upaiyun.com；建议填写绑定到又拍云的域名"
			>
				<Input
					id="upyun-domain"
					value={domain}
					onChange={event => setDomain(event.target.value)}
					placeholder="https://img.example.com"
					autoComplete="off"
					className="h-9 text-sm"
					disabled={loading || saving}
				/>
			</Field>

			<Field
				label="存储目录（可选）"
				htmlFor="upyun-directory"
				hint="会按日期自动分目录，例如 snowtools/2026/10/20/xxx.jpg"
			>
				<Input
					id="upyun-directory"
					value={directory}
					onChange={event => setDirectory(event.target.value)}
					placeholder="snowtools"
					autoComplete="off"
					className="h-9 text-sm"
					disabled={loading || saving}
				/>
			</Field>

			<div className="flex items-center justify-between gap-3 pt-1">
				<p className="min-w-0 text-[11px] text-slate-400">
					{configured
						? '已配置，图床会直接上传到又拍云。密码仅保存在本机。'
						: '未配置时，图床页会提示先完成配置。'}
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
							!bucket.trim() ||
							!operator.trim() ||
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
