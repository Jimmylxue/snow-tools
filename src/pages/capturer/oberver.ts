import Observable from '@/utils/observable'

export type TCapturerMessage = {
	source: string
	type: 'fullscreen' | 'region'
	scaleFactor: number
}

export const capturerObserve = new Observable<TCapturerMessage>()
export const capturerCloseObserve = new Observable()

window.ipcRenderer?.on('CAPTURE_TRIGGER', (_, content) => {
	capturerObserve.notify(content)
})

window.ipcRenderer?.on('CAPTURE_CLOSE', (_, content) => {
	capturerCloseObserve.notify(content)
})
