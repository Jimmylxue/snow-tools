import { makeAutoObservable } from 'mobx'

class CommandStore {
	/**
	 * 完整的指令
	 * 如 fanyi hello 这个指令 _command 会存完整的 fanyi hello 全部内容
	 */
	private _command: string = ''

	get command() {
		return this._command
	}

	set command(newCommand: string) {
		this._command = newCommand
	}

	/**
	 * 具体的 指令
	 * 如 fanyi hello 这个 _commandCommand 只会存 hello
	 */
	private _contentCommand: string = ''

	get contentCommand() {
		return this._contentCommand
	}

	set contentCommand(newCommand: string) {
		this._contentCommand = newCommand
	}

	constructor() {
		makeAutoObservable(this)
	}
}

export const commandStore = new CommandStore()
