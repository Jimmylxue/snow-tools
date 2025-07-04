import { observer } from 'mobx-react-lite'
import { SnowTools } from './component/commandBar'

export const Base = observer(() => {
	return (
		<div className=" w-full h-screen">
			<SnowTools />
		</div>
	)
})
