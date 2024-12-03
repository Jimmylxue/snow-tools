import { listenScreen, sendWindowSizeEvent } from '@/hooks/ipc/window'
import { commandStore } from '@/store/command'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useCommand } from '../../core/useCommand'

export const CommandBar = observer(() => {
	const { commandObject, inputText, updateInputText, deepDel } = useCommand()

	useEffect(() => {
		sendWindowSizeEvent(!!commandStore.command ? 'show' : 'close')
	}, [commandStore.command])

	useEffect(() => {
		return listenScreen()
	}, [])

	return (
		<div className=" flex items-center px-4">
			<div className=" text-2xl pr-2">{commandObject.icon}</div>
			<input
				id="commandBarInput"
				type="text"
				placeholder={commandObject.placeholder}
				className=" h-[60px] border-none outline-none w-full  text-lg"
				value={inputText}
				onInput={e => {
					// @ts-ignore
					updateInputText(e.target.value)
				}}
				onKeyDown={e => {
					if (inputText === '' && e.key === 'Backspace') {
						deepDel()
					}
				}}
			/>
		</div>
	)
})
