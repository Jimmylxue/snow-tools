import { TCopyItem } from './type'
import { BrowserWindow, clipboard } from 'electron'
import { createHash } from 'node:crypto'
import { saveClipboardImage } from './images'

let preTextList: string[] = []

/**
 * 图片去重：记录最近若干张图的指纹。
 * 同一张图来回复制很常见（比如反复贴同一张截图），
 * 不去重的话每按一次 Cmd+C 就会在磁盘上多留一份。
 */
const recentImageHashes: string[] = []
const MAX_IMAGE_HASH_MEMORY = 30

function isDuplicateImage(buffer: Buffer) {
	const hash = createHash('sha1').update(buffer).digest('hex')

	if (recentImageHashes.includes(hash)) return true

	recentImageHashes.push(hash)
	if (recentImageHashes.length > MAX_IMAGE_HASH_MEMORY) {
		recentImageHashes.shift()
	}

	return false
}

/**
 * 文本采集：沿用原有去重逻辑，只是把去重窗口从 20 条放宽到 50 条，
 * 避免来回复制几段长文时被过早判定为「已存在」。
 */
function buildTextItem(text: string): TCopyItem | null {
	const content = text.trim()
	if (!content) return null

	if (preTextList.includes(content)) return null

	preTextList.push(content)
	if (preTextList.length === 50) {
		preTextList = preTextList.slice(1)
	}

	return {
		content,
		createdTime: Date.now(),
		type: 'TEXT',
		isCollect: false,
	}
}

/**
 * 采集一次剪贴板。
 *
 * 图片优先：截图工具会把 PNG 放进剪贴板，此时 readText 往往也能读到
 * 一段无意义文本，先判图片可以避免存下垃圾文本。
 * 图片本体落盘，只把元数据发给渲染进程，避免大图在 IPC 上来回搬。
 */
export async function copyCallBack(
	mainWindow: BrowserWindow,
	text: string,
) {
	try {
		const image = clipboard.readImage()

		if (!image.isEmpty()) {
			const { width, height } = image.getSize()

			/**
			 * 在 macOS 上复制文件时，剪贴板也会带一个文件图标，
			 * 尺寸通常很小，用最小尺寸过滤掉，避免每复制一个文件就存一张图标。
			 */
			if (width < 16 || height < 16) return

			const pngBuffer = image.toPNG()

			/** 同一张图反复复制不再重复落盘 */
			if (isDuplicateImage(pngBuffer)) return

			const stored = await saveClipboardImage(image)

			/**
			 * 图片确实存在但没能落盘（缩完仍超限等），
			 * 直接放弃这一轮，不要退化成存一条无意义的文本。
			 */
			if (!stored) return

			const copyItem: TCopyItem = {
				/** 摘要给列表占位用，真正的展示交给缩略图 */
				content: `图片 ${stored.width}×${stored.height}`,
				createdTime: Date.now(),
				type: 'IMAGE',
				isCollect: false,
				image: stored,
			}

			mainWindow.webContents.send('CLIPBOARD_CHANGED', copyItem)
			return
		}

		const textItem = buildTextItem(text)
		if (!textItem) return

		mainWindow.webContents.send('CLIPBOARD_CHANGED', textItem)
	} catch (error) {
		console.error('采集剪贴板失败:', error)
	}
}
