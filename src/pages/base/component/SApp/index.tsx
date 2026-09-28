import { sendOpenApp } from '@/hooks/ipc/window'
import { TApp } from 'electron/biz/apps/type'

type TProps = {
	isSelected: boolean
	app: TApp
}

export function SApp({ isSelected, app }: TProps) {
	return (
		<div
			title={app.appName}
			onClick={() => {
				sendOpenApp(app.appPath)
			}}
			className={`flex flex-col items-center  rounded-lg cursor-pointer transition-all py-2 ${
				isSelected ? 'bg-blue-50 outline outline-blue-200' : 'hover:bg-gray-50'
			}`}
		>
			{app.iconUrl ? (
				<img className=" size-[30px] " src={app.iconUrl} alt="" />
			) : (
				<div className="size-[30px] rounded bg-gray-200" />
			)}
			<div
				className={`text-xs font-medium mt-1 truncate w-full text-center ${
					isSelected ? 'text-blue-600' : 'text-gray-600'
				}`}
			>
				{app.appName}
			</div>
		</div>
	)
}
