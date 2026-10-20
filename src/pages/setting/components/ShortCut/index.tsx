import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getIpc } from '@/hooks/ipc'
import { shortCutKeyMap } from './const'
import { TShortCutUUKey } from './type'
import { getKeyName } from './utils'

const ipc = getIpc()

/** 同一时间只允许一个快捷键进入录制状态，避免两组按键互相覆盖 */
const RECORDING_EVENT = 'snow-tools-shortcut-recording'

/** 修饰键本身不能作为组合键的主键 */
const MODIFIER_KEY_CODES = new Set([16, 17, 18, 91, 92, 93, 224])
const MODIFIER_NAMES = new Set(['Command', 'Ctrl', 'Alt', 'Shift', 'Super'])

function isMacPlatform() {
	return navigator.platform.includes('Mac')
}

function getKeyLabel(part: string) {
	const isMac = isMacPlatform()

	if (part === 'Ctrl') return isMac ? '⌃' : 'Ctrl'
	if (part === 'Alt') return isMac ? '⌥' : 'Alt'
	if (part === 'Shift') return isMac ? '⇧' : 'Shift'
	if (part === 'Command') return '⌘'
	if (part === 'Super') return 'Win'

	return part
}

function KeyCaps({
	value,
	placeholder,
}: {
	value: string
	placeholder?: string
}) {
	const parts = value.split('+').filter(Boolean)

	if (!parts.length) {
		return (
			<span className="text-xs text-slate-400">
				{placeholder ?? '未设置'}
			</span>
		)
	}

	return (
		<div className="flex items-center gap-1">
			{parts.map((part, index) => (
				<kbd
					key={`${part}-${index}`}
					className="min-w-[22px] rounded border border-slate-200 bg-white px-1.5 py-0.5 text-center font-mono text-[11px] font-medium text-slate-600 shadow-sm"
				>
					{getKeyLabel(part)}
				</kbd>
			))}
		</div>
	)
}

type TProps = {
	label: string
	description: string
	shortCutUUKey: TShortCutUUKey
}

export function ShortCut({ label, description, shortCutUUKey }: TProps) {
	const keys = shortCutKeyMap[shortCutUUKey]
	const defaultKey = isMacPlatform() ? keys.macDefaultKey : keys.winDefaultKey
	const [shortcut, setShortcut] = useState(
		() => localStorage.getItem(keys.localstorageKey) || defaultKey,
	)
	const [tempShortcut, setTempShortcut] = useState('')
	const [isListening, setIsListening] = useState(false)
	const listeningRef = useRef(false)

	const stopListening = useCallback(() => {
		listeningRef.current = false
		setIsListening(false)
		setTempShortcut('')
	}, [])

	const cancelEditing = useCallback(() => {
		stopListening()
		/** 让主进程按 localStorage 里的旧值重新注册 */
		ipc.send(keys.completed)
	}, [keys.completed, stopListening])

	const startListening = () => {
		listeningRef.current = true
		setTempShortcut('')
		setIsListening(true)
		ipc.send(keys.editing)
		window.dispatchEvent(
			new CustomEvent(RECORDING_EVENT, { detail: shortCutUUKey }),
		)
	}

	useEffect(() => {
		const handleOtherRecording = (event: Event) => {
			const detail = (event as CustomEvent<string>).detail
			if (detail !== shortCutUUKey && listeningRef.current) {
				cancelEditing()
			}
		}

		window.addEventListener(RECORDING_EVENT, handleOtherRecording)
		return () => {
			window.removeEventListener(RECORDING_EVENT, handleOtherRecording)
		}
	}, [cancelEditing, shortCutUUKey])

	const saveShortcut = useCallback(() => {
		const parts = tempShortcut.split('+').filter(Boolean)
		const hasMainKey = parts.some(part => !MODIFIER_NAMES.has(part))

		if (parts.length < 2 || !hasMainKey) {
			toast('请按下「修饰键 + 普通键」的组合')
			return
		}

		localStorage.setItem(keys.localstorageKey, tempShortcut)
		setShortcut(tempShortcut)
		stopListening()
		ipc.send(keys.completed)
		toast.success('快捷键已更新')
	}, [keys, stopListening, tempShortcut])

	const resetToDefault = () => {
		localStorage.setItem(keys.localstorageKey, defaultKey)
		setShortcut(defaultKey)
		stopListening()
		ipc.send(keys.completed)
		toast.success('已恢复默认快捷键')
	}

	/** 窗口失焦或被隐藏时自动放弃录制，避免主进程一直停留在「编辑快捷键」状态 */
	useEffect(() => {
		if (!isListening) return

		const handleInterrupt = () => cancelEditing()
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') cancelEditing()
		}

		window.addEventListener('blur', handleInterrupt)
		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			window.removeEventListener('blur', handleInterrupt)
			document.removeEventListener(
				'visibilitychange',
				handleVisibilityChange,
			)
		}
	}, [cancelEditing, isListening])

	useEffect(() => {
		if (!isListening) return

		const handleKeyDown = (event: KeyboardEvent) => {
			/** 捕获阶段拦截，避免 Esc 触发全局返回、也避免按键落到其它控件 */
			event.preventDefault()
			event.stopPropagation()

			if (event.key === 'Escape') {
				cancelEditing()
				return
			}

			const isMac = isMacPlatform()
			const parts: string[] = []

			if (event.metaKey) parts.push(isMac ? 'Command' : 'Super')
			if (event.ctrlKey) parts.push('Ctrl')
			if (event.altKey) parts.push('Alt')
			if (event.shiftKey) parts.push('Shift')

			if (!MODIFIER_KEY_CODES.has(event.keyCode)) {
				const keyName = getKeyName(event.keyCode)
				if (keyName && !parts.includes(keyName)) {
					parts.push(keyName)
				}
			}

			setTempShortcut(parts.join('+'))
		}

		window.addEventListener('keydown', handleKeyDown, true)
		return () => {
			window.removeEventListener('keydown', handleKeyDown, true)
		}
	}, [cancelEditing, isListening])

	/** 用户可能没点确认就直接关窗口，需要把主进程的监听状态收回来 */
	useEffect(() => {
		return () => {
			if (listeningRef.current) {
				ipc.send(keys.completed)
			}
		}
	}, [keys.completed])

	return (
		<div className="flex items-center justify-between gap-4 py-3">
			<div className="min-w-0">
				<div className="text-sm font-medium text-slate-800">{label}</div>
				<div className="mt-0.5 text-xs text-slate-400">{description}</div>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				{isListening ? (
					<>
						<div className="flex h-8 min-w-[180px] items-center rounded-md border border-blue-300 bg-blue-50/40 px-2.5">
							<KeyCaps
								value={tempShortcut}
								placeholder="请按下快捷键…"
							/>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onClick={cancelEditing}
						>
							取消
						</Button>
						<Button
							size="sm"
							disabled={!tempShortcut}
							onClick={saveShortcut}
						>
							确认
						</Button>
					</>
				) : (
					<>
						<div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2.5">
							<KeyCaps value={shortcut} />
						</div>
						{shortcut !== defaultKey && (
							<Button
								variant="ghost"
								size="icon"
								className="size-8 text-slate-400"
								title="恢复默认快捷键"
								onClick={resetToDefault}
							>
								<RotateCcw className="size-3.5" />
							</Button>
						)}
						<Button
							variant="outline"
							size="sm"
							onClick={startListening}
						>
							修改
						</Button>
					</>
				)}
			</div>
		</div>
	)
}
