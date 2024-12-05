import { useIpc } from '@/hooks/ipc'
import { CommandBar } from '@/pages/base/component/commandBar'
import { observer } from 'mobx-react-lite'
import { useEffect } from 'react'

export const Base = observer(() => {
	const ipc = useIpc()

	useEffect(() => {
		;(async () => {
			const icons = await ipc.invoke('get-app-icons')

			console.log('icons', icons)
		})()
	}, [])

	return (
		<div className=" w-full h-screen">
			<CommandBar />
			{/* <CommandBar />
			{commandStore.command && <Content />} */}
		</div>
	)
})
