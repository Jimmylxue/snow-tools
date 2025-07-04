import { useTranslateV2 } from '@/api/translate'
import { copyToClipboard, inputFocus } from '@/lib/utils'
import { observer } from 'mobx-react-lite'
import { useState, useRef, KeyboardEvent } from 'react'
import { TranslateContextProvider, useTranslateConfig } from './context'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { languageMap, TShortEn } from '@/api/translate/type'
import { toast } from 'sonner'

export const Child = observer(() => {
	const { from, to, updateFrom, updateTo, replace } = useTranslateConfig()

	const { mutateAsync, isPending, data, reset } = useTranslateV2({
		onSettled: () => {
			setTimeout(() => {
				inputFocus('translateInput')
			}, 100)
		},
		onSuccess: res => {
			setOutputText(res.trans_result[0].dst)
		},
	})

	const [inputText, setInputText] = useState('')
	const [outputText, setOutputText] = useState('')
	const inputRef = useRef(null)

	const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			// Trigger translation
			if (!inputText) {
				setOutputText('')
			} else if (inputText === data?.trans_result[0].src) {
				copyToClipboard(outputText)
				toast('The copy has been copied', {
					duration: 700,
				})
			} else {
				await mutateAsync({
					from,
					to,
					q: inputText,
				})
			}
		}
	}

	return (
		<div className="w-full h-screen bg-[#f5f6fa] rounded-[10px] shadow-[0_2px_12px_0_rgba(0,0,0,0.08)] flex flex-col overflow-hidden border border-[#e0e3eb] relative">
			{/* Language Selection */}
			<div className="flex items-center px-4 py-3 border-b border-[#e0e3eb] bg-white">
				<Select
					value={from}
					onValueChange={val => {
						updateFrom?.(val as unknown as TShortEn)
						reset()
					}}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="请选择语言" />
					</SelectTrigger>
					<SelectContent className=" h-[150px]">
						<SelectGroup>
							{Object.entries(languageMap).map((lang, index) => (
								<SelectItem key={index} value={lang[0]}>
									{lang[1]}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				<div
					className="mx-2 text-[#7f8fa4] cursor-pointer"
					onClick={() => {
						replace?.()
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
						/>
					</svg>
				</div>

				<Select
					value={to}
					onValueChange={val => {
						updateTo?.(val as unknown as TShortEn)
						reset()
					}}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="请选择语言" />
					</SelectTrigger>
					<SelectContent className=" h-[150px]">
						<SelectGroup>
							{Object.entries(languageMap).map((lang, index) => (
								<SelectItem key={index} value={lang[0]}>
									{lang[1]}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				<div className="absolute right-2 text-xs text-[#a4b0be] flex items-center">
					<span className="bg-[#e0e3eb] rounded px-2 py-1 flex items-center">
						<span className="border border-[#a4b0be] rounded-[3px] px-1 text-[10px] mr-1">
							ESC
						</span>
						退出
					</span>
				</div>

				<div className="ml-auto text-xs text-[#7f8fa4] flex items-center">
					{isPending ? (
						<>
							<span className="mr-1">翻译中</span>
							<div className="inline-block w-2 h-2 bg-[#487eb0] rounded-full animate-pulse"></div>
						</>
					) : inputText ? (
						<span className="flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-3 w-3 mr-1"
								viewBox="0 0 20 20"
								fill="#28ca42"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clipRule="evenodd"
								/>
							</svg>
							已翻译
						</span>
					) : null}
				</div>
			</div>

			{/* Text Areas */}
			<div className="flex flex-1 bg-white">
				<div className="flex-1 p-4 border-r border-[#e0e3eb]">
					<textarea
						ref={inputRef}
						className="w-full h-full bg-transparent resize-none focus:outline-none text-[#2f3640] placeholder-[#a4b0be]"
						placeholder="输入要翻译的文本 (按 Enter 确认)"
						value={inputText}
						onChange={e => setInputText(e.target.value)}
						onKeyDown={handleKeyDown}
						autoFocus
					/>
				</div>
				<div className="flex-1 p-4 relative">
					<div
						className={`w-full h-full ${
							outputText ? 'text-[#2f3640]' : 'text-[#a4b0be]'
						} overflow-auto`}
					>
						{outputText || '翻译结果将显示在这里'}
					</div>
					{isPending && (
						<div className="absolute inset-0 flex items-center justify-center bg-white/80">
							<div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[#487eb0] border-opacity-60"></div>
						</div>
					)}
				</div>
			</div>

			{/* Subtle Hint */}
			<div className="text-center py-2 text-xs text-[#a4b0be] bg-[#fafbfc] border-t border-[#e0e3eb]">
				<span className="inline-flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-3 w-3 mr-1"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clipRule="evenodd"
						/>
					</svg>
					输入文本后按 Enter 翻译，再按 Enter 复制
				</span>
			</div>
		</div>
	)
})

export const Translate = () => {
	return (
		<TranslateContextProvider>
			<Child />
		</TranslateContextProvider>
	)
}
