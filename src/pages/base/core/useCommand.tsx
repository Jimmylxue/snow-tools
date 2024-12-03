import { commandStore } from '@/store/command'
import { useMemo } from 'react'
import { getCommandKeyAndContent, getCommandObjectByKey } from './core'

export function useCommand() {
	const { command, contentCommand } = commandStore

	const commandObject = useMemo(() => {
		const { key } = getCommandKeyAndContent(command)
		return getCommandObjectByKey(key)
	}, [command])

	/**
	 * 是否命中 指令
	 */
	const isHitCommand = !!commandObject.key

	const inputText = isHitCommand ? contentCommand : command

	const updateInputText = (text: string) => {
		if (isHitCommand) {
			commandStore.contentCommand = text
			commandStore.command = commandObject.key + ' ' + text
		} else {
			commandStore.command = text
			commandStore.contentCommand = ''
		}
	}

	/**
	 * 在输入框为空的情况下 又删除内容
	 */
	const deepDel = () => {
		commandStore.contentCommand = ''
		commandStore.command = ''
	}

	return {
		commandObject,
		isHitCommand,
		inputText,
		updateInputText,
		deepDel,
	}
}
