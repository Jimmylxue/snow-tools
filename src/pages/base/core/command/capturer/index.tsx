import { Scissors } from 'lucide-react'
import { TBaseCommandProps } from '../type'
import { useEffect } from 'react'
import { useIpc } from '@/hooks/ipc'

const CapturerContent = ({ destructCommand }: TBaseCommandProps) => {
	const ipc = useIpc()

	useEffect(() => {
		destructCommand()
		ipc.send('COMMAND_TRIGGER_CAPTURER')
	}, [])

	return null
}

export const CAPTURER_COMMAND = {
	icon: <Scissors className="mr-2 shrink-0 opacity-50" />,
	key: 'capturer',
	placeholder: '',
	content: CapturerContent,
}
