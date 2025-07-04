import { getIpc } from '@/hooks/ipc'
import { TTools } from '../../type'
import { sendRouterNavigate } from '@/hooks/ipc/window'

type TProps = {
	isSelected: boolean
	stool: TTools
}

const ipc = getIpc()

export function STool({ isSelected, stool }: TProps) {
	return (
		<div
			className={`flex flex-col items-center  rounded-lg cursor-pointer transition-all py-2 ${
				isSelected
					? stool.recommended
						? 'bg-green-50 outline outline-green-200'
						: 'bg-blue-50 outline outline-blue-200'
					: 'hover:bg-gray-50'
			}`}
			onClick={() => {
				if (stool.routerName === 'capturer') {
					ipc.send('COMMAND_TRIGGER_CAPTURER')
				} else {
					sendRouterNavigate(stool.routerName)
				}
			}}
		>
			<img src={stool.iconUrl} className=" size-[30px]" alt="" />
			<div
				className={`text-xs font-medium mt-1 ${
					isSelected
						? stool.recommended
							? 'text-green-600'
							: 'text-blue-600'
						: 'text-gray-600'
				}`}
			>
				{stool.name}
			</div>
			{/* {stool.recommended && (
				<div className="text-[0.6rem] text-green-500 mt-1">★</div>
			)} */}
		</div>
	)
}
