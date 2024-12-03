import { Card } from '@/components/ui/card'
import { sendWindowSizeEvent } from '@/hooks/ipc/window'
import { useEffect, useState } from 'react'
export function Base() {
	const [commandText, setCommandText] = useState<string>('')

	useEffect(() => {
		sendWindowSizeEvent(!!commandText ? 'show' : 'close')
	}, [commandText])

	return (
		<Card className=" w-full">
			<input
				type="text"
				placeholder="Hi, tools"
				className=" h-[60px] border-none outline-none w-full pl-4 text-lg"
				value={commandText}
				onInput={e => {
					// @ts-ignore
					setCommandText(e.target.value)
				}}
			/>
		</Card>
	)
}
