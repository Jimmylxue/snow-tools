import { CommandBar } from '@/pages/base/component/commandBar'
import { observer } from 'mobx-react-lite'

export const Base = observer(() => {
	return (
		<div className=" w-full h-screen">
			<CommandBar />
		</div>
	)
})
