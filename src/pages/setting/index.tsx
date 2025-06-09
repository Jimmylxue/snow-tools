import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useState, useEffect, useRef } from 'react'

// 自定义Label组件
const Label = ({
	htmlFor,
	children,
	className = '',
}: {
	htmlFor?: string
	children: React.ReactNode
	className?: string
}) => {
	return (
		<label
			htmlFor={htmlFor}
			className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}
		>
			{children}
		</label>
	)
}

// 自定义Separator组件
const Separator = ({ className = '' }: { className?: string }) => {
	return (
		<div className={`h-[1px] w-full bg-border ${className}`} role="separator" />
	)
}

// 将键码转换为可读的键名
const getKeyName = (keyCode: number): string => {
	const keyMap: Record<number, string> = {
		8: 'Backspace',
		9: 'Tab',
		13: 'Enter',
		16: 'Shift',
		17: 'Ctrl',
		18: 'Alt',
		19: 'Pause',
		20: 'CapsLock',
		27: 'Esc',
		32: 'Space',
		33: 'PageUp',
		34: 'PageDown',
		35: 'End',
		36: 'Home',
		37: 'Left',
		38: 'Up',
		39: 'Right',
		40: 'Down',
		45: 'Insert',
		46: 'Delete',
		91: 'Win',
		93: 'Menu',
		112: 'F1',
		113: 'F2',
		114: 'F3',
		115: 'F4',
		116: 'F5',
		117: 'F6',
		118: 'F7',
		119: 'F8',
		120: 'F9',
		121: 'F10',
		122: 'F11',
		123: 'F12',
		144: 'NumLock',
		145: 'ScrollLock',
		186: ';',
		187: '=',
		188: ',',
		189: '-',
		190: '.',
		191: '/',
		192: '`',
		219: '[',
		220: '\\',
		221: ']',
		222: "'",
	}

	return keyMap[keyCode] || String.fromCharCode(keyCode)
}

type TProps = {
	show: boolean
	onClose: () => void
}

export function SystemSetting({ show, onClose }: TProps) {
	const [isListening, setIsListening] = useState(false)
	const [shortcut, setShortcut] = useState('Ctrl+K')
	const [tempShortcut, setTempShortcut] = useState('')
	const listeningRef = useRef(false)

	// 开始监听快捷键
	const startListening = () => {
		setIsListening(true)
		setTempShortcut('')
		listeningRef.current = true
	}

	// 停止监听快捷键
	const stopListening = () => {
		setIsListening(false)
		listeningRef.current = false
	}

	// 保存快捷键
	const saveShortcut = () => {
		if (tempShortcut) {
			setShortcut(tempShortcut)
		}
		stopListening()
	}

	// 取消修改
	const cancelEditing = () => {
		stopListening()
	}

	// 键盘事件处理
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (!listeningRef.current) return

			e.preventDefault()
			e.stopPropagation()

			const keys = []
			if (e.ctrlKey) keys.push('Ctrl')
			if (e.shiftKey) keys.push('Shift')
			if (e.altKey) keys.push('Alt')
			if (e.metaKey) keys.push('Win')

			// 不添加重复的键
			if (!keys.includes(getKeyName(e.keyCode))) {
				keys.push(getKeyName(e.keyCode))
			}

			setTempShortcut(keys.join('+'))
		}

		const handleKeyUp = () => {
			if (listeningRef.current && tempShortcut) {
				saveShortcut()
			}
		}

		if (isListening) {
			window.addEventListener('keydown', handleKeyDown)
			window.addEventListener('keyup', handleKeyUp)
		}

		return () => {
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('keyup', handleKeyUp)
		}
	}, [isListening, tempShortcut])

	return (
		<div>
			<Dialog
				open={show}
				onOpenChange={status => {
					if (status === false) {
						onClose()
					}
				}}
			>
				<DialogContent className="max-w-[800px] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>系统设置</DialogTitle>
						<DialogDescription>根据您的偏好自定义软件行为</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						{/* 快捷启动设置部分 */}
						<div className="space-y-4">
							<h3 className="text-lg font-medium">快捷启动</h3>
							<Separator />

							<div className="space-y-3">
								<div className="grid grid-cols-4 items-center gap-4">
									<Label htmlFor="shortcut" className="text-right">
										快捷指令
									</Label>
									<div className="col-span-3 flex items-center gap-2">
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

								<div className="text-sm text-muted-foreground pl-[calc(25%+1rem)]">
									{isListening
										? '请按下您想要的快捷键组合'
										: '当前快捷键: ' + shortcut}
								</div>
							</div>
						</div>

						{/* 其他设置部分 */}
						<div className="space-y-4">
							<h3 className="text-lg font-medium">通用设置</h3>
							<Separator />

							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="name" className="text-right">
									名称
								</Label>
								<Input
									id="name"
									defaultValue="Pedro Duarte"
									className="col-span-3"
								/>
							</div>

							<div className="grid grid-cols-4 items-center gap-4">
								<Label htmlFor="username" className="text-right">
									用户名
								</Label>
								<Input
									id="username"
									defaultValue="@peduarte"
									className="col-span-3"
								/>
							</div>
						</div>
					</div>

					<div className="mt-6 flex justify-end">
						<Button type="submit">保存设置</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
