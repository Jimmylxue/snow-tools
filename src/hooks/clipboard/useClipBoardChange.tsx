import Observable from '@/utils/observable'
import { TCopyItem } from 'electron/biz/clipboard/type'
import { useEffect } from 'react'
import { useClipboardDB } from './db'

const clipboardChangeObserve = new Observable<TCopyItem>()

window.ipcRenderer.on('CLIPBOARD_CHANGED', (_, content) => {
	clipboardChangeObserve.notify(content)
})

export function useClipBoardChange() {
	const { addClipBoard } = useClipboardDB()

	useEffect(() => {
		return clipboardChangeObserve.subscribe(async content => {
			await addClipBoard(content)
		})
	}, [addClipBoard])
}
