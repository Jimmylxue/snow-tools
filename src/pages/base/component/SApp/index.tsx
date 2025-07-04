import { sendOpenApp } from '@/hooks/ipc/window'
import { TApp } from 'electron/biz/apps/type'

type TProps = {
	isSelected: boolean
	app: TApp
}

export function SApp({ isSelected, app }: TProps) {
	return (
		<div
			className={`flex flex-col items-center  rounded-lg cursor-pointer transition-all py-2 ${
				isSelected ? 'bg-blue-50 outline outline-blue-200' : 'hover:bg-gray-50'
			}`}
			onClick={() => {
				sendOpenApp(app.appName)
			}}
		>
			<img className=" size-[30px] " src={app.iconUrl} alt="" />
			<div
				className={`text-xs font-medium mt-1 ${
					isSelected ? 'text-blue-600' : 'text-gray-600'
				}`}
			>
				{app.appName.slice(0, 10)}
			</div>
		</div>
	)
}
