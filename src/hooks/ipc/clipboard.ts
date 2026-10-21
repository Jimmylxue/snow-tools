import type { TClipboardImageStats } from 'electron/biz/clipboard/type'
import { getIpc } from '.'

const ipc = getIpc()

/** 取图片缩略图（data URL），原图不经过渲染进程 */
export function getClipboardImageThumbnail(fileName: string) {
	return ipc.invoke('CLIPBOARD_IMAGE_THUMBNAIL', fileName) as Promise<
		string | null
	>
}

export function getClipboardImageStats() {
	return ipc.invoke('CLIPBOARD_IMAGE_STATS') as Promise<TClipboardImageStats>
}

/** 把磁盘上的原图写回系统剪贴板 */
export function copyClipboardImage(fileName: string) {
	return ipc.invoke('CLIPBOARD_IMAGE_COPY', fileName) as Promise<{
		ok: boolean
	}>
}

/** 一键释放图片占用；传入收藏项的文件名，确保它们不被删 */
export function clearClipboardImages(keepFileNames: string[] = []) {
	return ipc.invoke('CLIPBOARD_IMAGE_CLEAR', keepFileNames) as Promise<{
		removed: number
	}>
}
