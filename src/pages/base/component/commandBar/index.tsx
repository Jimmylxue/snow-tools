import { sendHideWindowEvent, sendWindowSizeEvent } from '@/hooks/ipc/window'
import { useEffect, useState, ChangeEvent, useCallback } from 'react'
import { observer } from 'mobx-react-lite'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandList,
	CommandSeparator,
} from '@/components/ui/command'
import { Search, Settings } from 'lucide-react'
import { Loading } from '@/components/common/Loading'
import {
	codingCommandGroup,
	keyMap,
	toolsCommandGroup,
} from '../../core/command/map'
import { inputFocus } from '@/lib/utils'
import { SystemSetting } from '@/pages/setting'
import { getIpc } from '@/hooks/ipc'

const inputId = 'baseCommandInput'

const ipc = getIpc()

export const CommandBar = observer(() => {
	const [inputText, setInputText] = useState<string>('')
	const [chooseCommand, setChooseCommand] = useState<string>('')

	const [systemSettingShow, setSystemSettingShow] = useState<boolean>(false)

	const [currentUseCommand, setCurrentUseCommand] = useState<string>('')

	useEffect(() => {
		sendWindowSizeEvent(inputText ? 'INPUTTING' : 'NORMAL')
	}, [inputText])

	useEffect(() => {
		const id = setTimeout(() => {
			inputFocus(inputId)
		}, 50)
		return () => clearTimeout(id)
	}, [])

	const destructCommand = useCallback(() => {
		setCurrentUseCommand('')
		setTimeout(() => {
			inputFocus(inputId)
		}, 100)
	}, [])

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault()
				if (currentUseCommand) {
					destructCommand()
				} else {
					sendHideWindowEvent()
				}
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [currentUseCommand, destructCommand])

	useEffect(() => {
		const windowShownFn = () => {
			inputFocus(inputId)
		}
		ipc.on('window-shown', windowShownFn)
		return () => {
			ipc.off('window-shown', windowShownFn)
		}
	}, [])

	const goalCommand = keyMap[currentUseCommand]

	return (
		<>
			{!currentUseCommand ? (
				<Command
					onKeyDown={e => {
						if (e.key === 'Enter' && chooseCommand) {
							setCurrentUseCommand(chooseCommand.split(' ')[0])
						}
					}}
					onValueChange={val => {
						/**
						 * 选中项 的值
						 */
						setChooseCommand(val)
					}}
					value={chooseCommand}
					className="rounded-lg border shadow-md md:min-w-[450px]"
				>
					<CommandInput
						icon={<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />}
						style={{ height: 60 }}
						placeholder="Type a command or search..."
						value={inputText}
						inputId={inputId}
						onInput={(e: ChangeEvent<HTMLInputElement>) => {
							setInputText(e.target.value)
						}}
						rightIcon={
							<Settings
								className="shrink-0 opacity-50"
								onClick={() => {
									setSystemSettingShow(true)
									sendWindowSizeEvent('SYSTEM_SETTING')
								}}
							/>
						}
					/>
					<CommandList>
						<CommandEmpty>
							<div className=" mt-4 w-full h-full flex flex-col justify-center items-center">
								<Loading />
								<div className="mt-4">No results found.</div>
							</div>
						</CommandEmpty>
						<CommandGroup heading={codingCommandGroup.heading}>
							{codingCommandGroup.groups.map((Item, index) => (
								<Item
									onClickChoose={command => {
										console.log('ssss', command.split(' ')[0])
										setCurrentUseCommand(command.split(' ')[0])
									}}
									key={index}
								/>
							))}
						</CommandGroup>
						<CommandSeparator />
						<CommandGroup heading={toolsCommandGroup.heading}>
							{toolsCommandGroup.groups.map((Item, index) => (
								<Item
									onClickChoose={command =>
										setCurrentUseCommand(command.split(' ')[0])
									}
									key={index}
								/>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			) : (
				<goalCommand.content destructCommand={destructCommand} />
			)}
			<SystemSetting
				show={systemSettingShow}
				onClose={() => {
					setSystemSettingShow(false)
					sendWindowSizeEvent(inputText ? 'INPUTTING' : 'NORMAL')
				}}
			/>
		</>
	)
})
