import { CommandItem } from '@/components/ui/command'
import { ClipboardList } from 'lucide-react'
import { TCommandItemProps } from '../../type'

export function ClipboardCommandItem({ onClickChoose }: TCommandItemProps) {
	const commandText = 'clipboard 剪切板'

	return (
		<div
			onClick={() => {
				onClickChoose(commandText)
			}}
		>
			<CommandItem>
				<ClipboardList />
				<span>{commandText}</span>
			</CommandItem>
		</div>
	)
}
