import { keyMap } from './const/map'
import { NORMAL_COMMAND } from './const/normal'

export function getCommandKeyAndContent(command: string) {
	if (command.indexOf(' ') === -1) {
		return {
			key: '',
			content: '',
		}
	}
	const [key, content] = command.split(' ')
	return {
		key,
		content,
	}
}

export function getCommandObjectByKey(key: string) {
	return keyMap[key] || NORMAL_COMMAND
}
