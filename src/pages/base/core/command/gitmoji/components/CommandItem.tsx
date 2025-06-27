import { CommandItem } from '@/components/ui/command'
import { Smile } from 'lucide-react'
import { TCommandItemProps } from '../../type'

export function GitMojiCommandItem({ onClickChoose }: TCommandItemProps) {
	const commandText = 'Git-Moji'

	return (
		<div
			onClick={() => {
				onClickChoose(commandText)
			}}
		>
			<CommandItem>
				<Smile />
				<span>Git-Moji</span>
			</CommandItem>
		</div>
	)
}
