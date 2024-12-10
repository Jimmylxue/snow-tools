import { languageMap } from '@/api/translate/type'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useTranslateConfig } from './context'

type TProps = {
	show: boolean
	onClose: () => void
}

export function Setting({ show, onClose }: TProps) {
	const { from, to, updateFrom, updateTo } = useTranslateConfig()

	return (
		<Dialog
			open={show}
			onOpenChange={status => {
				if (status === false) {
					onClose()
				}
			}}
		>
			<DialogContent className=" max-w-full max-h-full h-full">
				<DialogHeader>
					<DialogTitle>翻译设置</DialogTitle>
					<DialogDescription>翻译语种设置</DialogDescription>
				</DialogHeader>
				<div className="grid py-4 h-full -mt-[60px]">
					<div className="grid grid-cols-4 items-center gap-4">
						<div>被翻译语种</div>
						<Select
							value={from}
							onValueChange={val => {
								updateFrom?.(val as any)
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
					</div>
					<div className="grid grid-cols-4 items-center gap-4 mt-10">
						<div>要翻译的语种</div>
						<Select
							value={to}
							onValueChange={val => {
								updateTo?.(val as any)
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
					</div>
				</div>
				{/* <DialogFooter>
					<Button type="submit">Save changes</Button>
				</DialogFooter> */}
			</DialogContent>
		</Dialog>
	)
}
