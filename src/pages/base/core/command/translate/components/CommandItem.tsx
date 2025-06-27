import { CommandItem } from '@/components/ui/command'
import { BookType } from 'lucide-react'
import { TCommandItemProps } from '../../type'

export function TranslateCommandItem({ onClickChoose }: TCommandItemProps) {
	const commandText = 'translate 翻译'

	return (
		<div
			onClick={() => {
				onClickChoose(commandText)
			}}
		>
			<CommandItem>
				<BookType />
				<span>translate 翻译</span>
			</CommandItem>
		</div>
	)
}
