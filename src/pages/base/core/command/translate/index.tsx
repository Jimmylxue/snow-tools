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
import { commandStore } from '@/store/command'
import { debounce } from 'lodash-es'
import { BookType } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { sendRouterChangeEvent, sendWindowSizeEvent } from '@/hooks/ipc/window'

const placeholderText = 'Please enter the translation content'

type TProps = {
	destructCommand: () => void
}

export const TranslateContent = observer(({ destructCommand }: TProps) => {
	const [translateText, setTranslateText] = useState<string>('')

	const [chooseTranslate, setChooseTranslate] = useState<string>('')

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

	const debounceFn = debounce(() => {
		mutateAsync({
			from: 'zh',
			to: 'en',
			q: commandStore.contentCommand,
		})
	}, 300)

	useEffect(() => {
		inputFocus('translateInput')
	}, [])

	useEffect(() => {
		if (commandStore.isEnter) {
			debounceFn()
		}
	}, [commandStore.isEnter])

	useEffect(() => {
		sendWindowSizeEvent(!!translateText ? 'show' : 'close')
	}, [translateText])
	return (
		<>
			<Command
				key={JSON.stringify(data)}
				onKeyDown={e => {
					if (e.key === 'Enter' && hasTranslateResult) {
						copyToClipboard(data?.trans_result?.[0]?.dst!)
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
					icon={
						<BookType
							className="mr-2 shrink-0 opacity-50"
							onClick={() => {
								sendRouterChangeEvent({
									routerName: 'setting',
									type: 'show',
								})
							}}
						/>
					}
					style={{ height: 60 }}
					placeholder={placeholderText}
					value={translateText}
					onInput={e => {
						// @ts-ignore
						setTranslateText(e.target.value)
					}}
					onKeyDown={async e => {
						// @ts-ignore
						const newValue = e.target.value
						if (translateText === '' && e.key === 'Backspace') {
							destructCommand()
						}
						if (
							translateText.trim() !== '' &&
							e.key === 'Enter' &&
							!isSameRequest
						) {
							await mutateAsync({
								from: 'zh',
								to: 'en',
								q: translateText.trim(),
							})
						}
					}}
				/>
				{translateText && (
					<>
						{isPending ? (
							<div className=" w-full flex justify-center items-center">
								<Loading />
							</div>
						) : (
							<>
								{data?.trans_result?.length && (
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
								)}
								<div className=" text-sm w-full text-center justify-center fixed bottom-4">
									Enter to copy!
								</div>
							</>
						)}
					</>
				)}
			</Command>

			{/* <Setting /> */}
		</>
	)
})

export const TRANSLATE_COMMAND = {
	icon: <BookType className="mr-2 shrink-0 opacity-50" />,
	key: 'fanyi',
	placeholder: placeholderText,
	content: TranslateContent,
}
