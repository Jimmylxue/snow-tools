import { CAPTURER_COMMAND } from './capturer'
import { CLIPBOARD_COMMAND } from './clipboard'
import { GITMOJI_COMMAND } from './gitmoji'
import { TRANSLATE_COMMAND } from './translate'

export const keyMap = {
	[TRANSLATE_COMMAND.key]: TRANSLATE_COMMAND,
	[GITMOJI_COMMAND.key]: GITMOJI_COMMAND,
	[CLIPBOARD_COMMAND.key]: CLIPBOARD_COMMAND,
	[CAPTURER_COMMAND.key]: CAPTURER_COMMAND,
}

export const codingCommandGroup = {
	heading: 'coding',
	groups: [GITMOJI_COMMAND.commandItem],
}

export const toolsCommandGroup = {
	heading: 'tools',
	groups: [
		TRANSLATE_COMMAND.commandItem,
		CAPTURER_COMMAND.commandItem,
		CLIPBOARD_COMMAND.commandItem,
	],
}
