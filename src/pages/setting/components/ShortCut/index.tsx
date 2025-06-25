import { useCallback, useEffect, useRef, useState } from 'react'
import { Label } from '../Lable'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getKeyName } from './utils'
import { shortCutKeyMap } from './const'
import { TShortCutUUKey } from './type'
import { getIpc } from '@/hooks/ipc'
import { toast } from 'sonner'

type TProps = {
	label: string
	shortCutUUKey: TShortCutUUKey
}

const ipc = getIpc()

export function StartShortCut({ label, shortCutUUKey }: TProps) {
	const [shortcut, setShortcut] = useState('')
	const [tempShortcut, setTempShortcut] = useState('')
	const [isListening, setIsListening] = useState(false)
	const listeningRef = useRef(false)

	const keys = shortCutKeyMap?.[shortCutUUKey]

	// 开始监听快捷键
	const startListening = () => {
		setIsListening(true)
		setTempShortcut('')
		listeningRef.current = true
		ipc.send(keys.editing)
	}

	// 停止监听快捷键
	const stopListening = () => {
		setIsListening(false)
		listeningRef.current = false
	}

	// 取消修改
	const cancelEditing = () => {
		stopListening()
		/**
		 * 这一步其实是 恢复的 逻辑
		 */
		ipc.send(keys.completed)
	}

	// 保存快捷键
	const saveShortcut = useCallback(() => {
		if (tempShortcut.split('+').length < 2) {
			toast('请输入正确组合键', {
				duration: 700,
			})
			cancelEditing()
			return
		}
		if (tempShortcut) {
			localStorage.setItem(keys.localstorageKey, tempShortcut)
			setShortcut(tempShortcut)
		}
		stopListening()
		ipc.send(keys.completed)
	}, [tempShortcut])

	// 初始化快捷键设置
	useEffect(() => {
		const isMac = navigator.platform.includes('Mac')
		const defaultHotkey = isMac ? keys.macDefaultKey : keys.winDefaultKey
		const savedHotkey =
			localStorage.getItem(keys.localstorageKey) || defaultHotkey
		setShortcut(savedHotkey)
	}, [])

	// 键盘事件处理
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!listeningRef.current) return

			e.preventDefault()
			e.stopPropagation()

			const isMac = navigator.platform.includes('Mac')
			const keys = []

			// 处理修饰键
			if (e.ctrlKey && !isMac) keys.push('Ctrl') // Windows/Linux 的 Ctrl
			if (e.shiftKey) keys.push('Shift')
			if (e.altKey) keys.push('Alt')
			if (e.metaKey) keys.push(isMac ? 'Command' : 'Win') // 根据平台显示正确名称

			// 添加主键（避免重复）
			const keyName = getKeyName(e.keyCode)
			if (!keys.includes(keyName)) {
				keys.push(keyName)
			}

			setTempShortcut(keys.join('+'))
		}

		if (isListening) {
			window.addEventListener('keydown', handleKeyDown)
		}

		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isListening, saveShortcut])

	useEffect(() => {
		if (isListening) {
			const isSuccessCode = tempShortcut.split('+').length === 2
			if (isSuccessCode) {
				saveShortcut()
			}
		}
	}, [tempShortcut, isListening])

	return (
		<div className="space-y-3">
			<div className=" flex items-center">
				<Label htmlFor="shortcut" className="text-right w-[120px]">
					{label}
				</Label>
				<div className="flex items-center gap-2 ml-6">
					{isListening ? (
						<>
							<Input
								id="shortcut"
								value={tempShortcut || '请按下快捷键...'}
								readOnly
								className="flex-1"
							/>
							<Button variant="outline" onClick={cancelEditing}>
								取消
							</Button>
							<Button onClick={saveShortcut}>确认</Button>
						</>
					) : (
						<>
							<Input
								id="shortcut"
								value={shortcut}
								readOnly
								className="flex-1"
							/>
							<Button onClick={startListening}>修改</Button>
						</>
					)}
				</div>
			</div>

			<div className="text-sm text-muted-foreground ml-[120px]">
				<div className=" ml-6">
					{isListening ? '请按下您想要的快捷键组合' : `当前快捷键: ${shortcut}`}
				</div>
			</div>
		</div>
	)
}
