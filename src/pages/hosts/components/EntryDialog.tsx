import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
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
import type { THostsEntry } from 'electron/biz/hosts/type'
import { Switch } from '@/components/ui/switch'

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/
const DOMAIN_RE = /^[a-zA-Z0-9_]([a-zA-Z0-9._-]*[a-zA-Z0-9_])?$/

function isLikelyIp(value: string) {
	if (IPV4_RE.test(value)) {
		return value
			.split('.')
			.every(part => Number(part) >= 0 && Number(part) <= 255)
	}

	return value.includes(':') && /^[0-9a-fA-F:.%]+$/.test(value)
}

function isLikelyDomain(value: string) {
	return value.length > 0 && value.length <= 253 && DOMAIN_RE.test(value)
}

function ipFamily(value: string) {
	if (!isLikelyIp(value)) return 0
	return value.includes(':') ? 6 : 4
}

type TProps = {
	open: boolean
	entry: THostsEntry | null
	entries: THostsEntry[]
	onOpenChange: (open: boolean) => void
	onSubmit: (entry: THostsEntry) => void
}

export function EntryDialog({
	open,
	entry,
	entries,
	onOpenChange,
	onSubmit,
}: TProps) {
	const [ip, setIp] = useState('')
	const [domains, setDomains] = useState('')
	const [comment, setComment] = useState('')
	const [enabled, setEnabled] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		if (!open) return
		setIp(entry?.ip ?? '')
		setDomains(entry?.domains.join(' ') ?? '')
		setComment(entry?.comment ?? '')
		setEnabled(entry?.enabled ?? true)
		setError('')
	}, [open, entry])

	const handleSubmit = () => {
		const ipValue = ip.trim()
		if (!ipValue) {
			setError('请填写 IP 地址')
			return
		}
		if (!isLikelyIp(ipValue)) {
			setError('IP 格式不正确，例如 127.0.0.1 或 ::1')
			return
		}

		const domainList = Array.from(
			new Set(
				domains
					.split(/[\s,，]+/)
					.map(domain => domain.trim().toLowerCase())
					.filter(Boolean),
			),
		)

		if (!domainList.length) {
			setError('请至少填写一个域名')
			return
		}

		const invalidDomain = domainList.find(
			domain => !isLikelyDomain(domain),
		)
		if (invalidDomain) {
			setError(`域名格式不正确：${invalidDomain}`)
			return
		}

		const family = ipFamily(ipValue)
		const duplicatedDomain = enabled
			? domainList.find(domain =>
					entries.some(
						other =>
							other.id !== entry?.id &&
							other.enabled &&
							ipFamily(other.ip) === family &&
							other.domains.some(
								item => item.toLowerCase() === domain,
							),
					),
				)
			: undefined

		if (duplicatedDomain) {
			setError(
				`域名 ${duplicatedDomain} 已被相同协议族的启用条目使用`,
			)
			return
		}

		onSubmit({
			id: entry?.id ?? uuidv4(),
			ip: ipValue,
			domains: domainList,
			comment: comment.trim(),
			enabled,
		})
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[460px]">
				<DialogHeader>
					<DialogTitle>{entry ? '编辑条目' : '新增条目'}</DialogTitle>
					<DialogDescription>
						域名会按顺序写入系统 hosts，支持一次绑定多个域名。
					</DialogDescription>
				</DialogHeader>

				<form
					className="space-y-4"
					onSubmit={event => {
						event.preventDefault()
						handleSubmit()
					}}
				>
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-slate-600">
							IP 地址
						</label>
						<Input
							autoFocus
							value={ip}
							onChange={event => {
								setIp(event.target.value)
								setError('')
							}}
							placeholder="127.0.0.1"
							className="h-9 font-mono text-sm"
						/>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-medium text-slate-600">
							域名
						</label>
						<Input
							value={domains}
							onChange={event => {
								setDomains(event.target.value)
								setError('')
							}}
							placeholder="api.dev.local dev.local"
							className="h-9 font-mono text-sm"
						/>
						<p className="text-[11px] text-slate-400">
							多个域名用空格或逗号分隔
						</p>
					</div>

					<div className="space-y-1.5">
						<label className="text-xs font-medium text-slate-600">
							备注
						</label>
						<Input
							value={comment}
							onChange={event => setComment(event.target.value)}
							placeholder="可选，例如：指向本地后端"
							className="h-9 text-sm"
						/>
					</div>

					<div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
						<div>
							<div className="text-sm text-slate-700">启用该条目</div>
							<div className="text-[11px] text-slate-400">
								停用的条目不会写入系统 hosts
							</div>
						</div>
						<Switch
							checked={enabled}
							onChange={value => {
								setEnabled(value)
								setError('')
							}}
							label="启用条目"
						/>
					</div>

					{error && (
						<p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
							{error}
						</p>
					)}

					<DialogFooter className="gap-2 sm:space-x-0">
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
