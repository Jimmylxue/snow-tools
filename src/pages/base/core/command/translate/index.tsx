import { useTranslateV2 } from '@/api/translate'
import { Loading } from '@/components/common/Loading'
import {
	CommandInput,
	Command,
	CommandList,
	CommandGroup,
	CommandItem,
} from '@/components/ui/command'
import { copyToClipboard, inputFocus } from '@/lib/utils'
import { BookType, Settings } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useEffect, useState, ChangeEvent } from 'react'
import { toast } from 'sonner'
import { sendWindowSizeEvent } from '@/hooks/ipc/window'
import { Setting } from './setting'
import { TranslateContextProvider, useTranslateConfig } from './context'
import SimlePng from '@/assets/img/smile.png'

const placeholderText = 'Please enter the translation content'

type TProps = {
	destructCommand: () => void
}

export const Child = observer(({ destructCommand }: TProps) => {
	const { from, to } = useTranslateConfig()

	const [translateText, setTranslateText] = useState<string>('')

	const [chooseTranslate, setChooseTranslate] = useState<string>('')

	const [settingShow, setSettingShow] = useState<boolean>(false)

	const { mutateAsync, isPending, data } = useTranslateV2({
		onSettled: () => {
			setTimeout(() => {
				inputFocus('translateInput')
			}, 100)
		},
	})

	/**
	 * 有翻译结果
	 */
	const hasTranslateResult = data?.trans_result?.length

	const isSameRequest = data?.trans_result?.[0]?.src === translateText

	useEffect(() => {
		inputFocus('translateInput')
	}, [])

	useEffect(() => {
		sendWindowSizeEvent(translateText ? 'INPUTTING' : 'NORMAL')
	}, [translateText])
	return (
		<>
			<Command
				key={JSON.stringify(data)}
				onKeyDown={e => {
					if (
						e.key === 'Enter' &&
						hasTranslateResult &&
						data?.trans_result?.[0]?.dst
					) {
						copyToClipboard(data.trans_result[0].dst)
						toast('The copy has been copied', {})
						setTimeout(() => {
							inputFocus('translateInput')
						}, 100)
					}
				}}
				value={chooseTranslate}
				onValueChange={val => {
					/**
					 * 选中项 的值
					 */
					setChooseTranslate(val)
				}}
			>
				<CommandInput
					inputId="translateInput"
					icon={<BookType className="mr-2 shrink-0 opacity-50" />}
					style={{ height: 60 }}
					placeholder={placeholderText}
					value={translateText}
					onInput={(e: ChangeEvent<HTMLInputElement>) => {
						setTranslateText(e.target.value)
					}}
					onKeyDown={async (e: React.KeyboardEvent<HTMLInputElement>) => {
						if (translateText === '' && e.key === 'Backspace') {
							destructCommand()
						}
						if (
							translateText.trim() !== '' &&
							e.key === 'Enter' &&
							!isSameRequest
						) {
							await mutateAsync({
								from,
								to,
								q: translateText.trim(),
							})
						}
					}}
					rightIcon={
						<Settings
							className="shrink-0 opacity-50"
							onClick={() => {
								sendWindowSizeEvent('FANYI_SETTING')
								setSettingShow(true)
							}}
						/>
					}
				/>
				{translateText && (
					<>
						{isPending ? (
							<div className=" w-full flex justify-center items-center">
								<Loading />
							</div>
						) : (
							<>
								{data?.trans_result?.length ? (
									<CommandList>
										<CommandGroup>
											{data?.trans_result?.map((item, index) => (
												<CommandItem key={index}>
													<div>
														<div className=" hidden">{item.src}</div>
														<div>{item.dst}</div>
													</div>
												</CommandItem>
											))}
										</CommandGroup>
									</CommandList>
								) : (
									<img
										className=" w-[130px] mx-auto mt-4"
										src={SimlePng}
										alt={'smilePng'}
									/>
								)}
								<div className=" text-sm w-full text-center justify-center fixed bottom-4">
									Enter to copy!
								</div>
							</>
						)}
					</>
				)}
			</Command>

			<Setting
				show={settingShow}
				onClose={() => {
					setSettingShow(false)
					sendWindowSizeEvent(translateText ? 'INPUTTING' : 'NORMAL')
				}}
			/>
		</>
	)
})

export const TranslateContent = ({ destructCommand }: TProps) => {
	return (
		<TranslateContextProvider>
			<Child destructCommand={destructCommand} />
		</TranslateContextProvider>
	)
}

export const TRANSLATE_COMMAND = {
	icon: <BookType className="mr-2 shrink-0 opacity-50" />,
	key: 'fanyi',
	placeholder: placeholderText,
	content: TranslateContent,
}
