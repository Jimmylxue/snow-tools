import Observable from '@/utils/observable'
import { TCopyItem } from 'electron/biz/clipboard/type'
import { useEffect } from 'react'
import { useClipboardDB } from './db'

/**
 * 「剪贴板该刷新了」的统一通知源。
 *
 * 主进程有两种触发：Cmd+C 推 CLIPBOARD_CHANGED，
 * 窗口重新显示推 CLIPBOARD_WINDOW_SHOWN。
 * 前者要先落库再刷新，否则界面会比数据早一步，查出来还是旧的。
 */
const clipboardChangeObserve = new Observable<void>()

type TPersistHandler = (content: TCopyItem) => Promise<void>

let persistHandler: TPersistHandler | null = null

export function setClipboardPersistHandler(handler: TPersistHandler | null) {
	persistHandler = handler
}

export function subscribeClipboardChange(fn: () => void) {
	return clipboardChangeObserve.subscribe(fn)
}

window.ipcRenderer.on('CLIPBOARD_CHANGED', (_, content: TCopyItem) => {
	void (async () => {
		try {
			await persistHandler?.(content)
		} catch (error) {
			console.error('剪贴板入库失败:', error)
		} finally {
			/** 入库失败也要通知，让界面反映真实状态而不是停在旧数据 */
			clipboardChangeObserve.notify()
		}
	})()
})

window.ipcRenderer.on('CLIPBOARD_WINDOW_SHOWN', () => {
	clipboardChangeObserve.notify()
})

export function useClipBoardChange() {
	const { addClipBoard } = useClipboardDB()

	useEffect(() => {
		setClipboardPersistHandler(addClipBoard)
		return () => setClipboardPersistHandler(null)
	}, [addClipBoard])
}
