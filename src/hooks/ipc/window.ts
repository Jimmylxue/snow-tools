import { useIpc } from '.'

const ipc = useIpc()

export function sendWindowSizeEvent(type: 'show' | 'close') {
	console.log('hhhh')
	ipc.send('search-input-event', type)
}
