import { Scissors } from 'lucide-react'
import { TBaseCommandProps } from '../type'
import { useEffect } from 'react'
import { getIpc } from '@/hooks/ipc'
import { CapturerCommandItem } from './components/CommandItem'

const ipc = getIpc()

const CapturerContent = ({ destructCommand }: TBaseCommandProps) => {
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
	commandItem: CapturerCommandItem,
}
