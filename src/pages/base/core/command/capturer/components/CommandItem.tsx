import { CommandItem, CommandShortcut } from '@/components/ui/command'
import { Scissors } from 'lucide-react'
import { TCommandItemProps } from '../../type'
import { getCurrentShortcut } from '@/utils/shortcut'

export function CapturerCommandItem({ onClickChoose }: TCommandItemProps) {
	const commandText = 'capturer 截屏'
	const shortcutKey = 'snow-tools-capturer_hotkey'

	const capturerHotkey = getCurrentShortcut(shortcutKey)

	return (
		<div
			onClick={() => {
				onClickChoose(commandText)
			}}
		>
			<CommandItem>
				<Scissors />
				<span>{commandText}</span>
				<CommandShortcut>{capturerHotkey}</CommandShortcut>
			</CommandItem>
		</div>
	)
}
