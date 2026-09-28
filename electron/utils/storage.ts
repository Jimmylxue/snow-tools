import {
	BrowserWindow,
	clipboard,
	dialog,
	nativeImage,
	NativeImage,
} from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'

function isRawPngBuffer(
	source: string | Uint8Array | NativeImage,
): source is Uint8Array {
	return source instanceof Uint8Array
}

function normalizeImage(source: string | NativeImage) {
	if (typeof source === 'string') {
		const base64 = source.replace(/^data:image\/\w+;base64,/, '')
		return nativeImage.createFromBuffer(Buffer.from(base64, 'base64'))
	}

	return source
}
/**
 * 将base64 图片存入剪切板
 */
export function copyImageToClipboard(
	source: string | Uint8Array | NativeImage,
) {
	try {
		if (isRawPngBuffer(source)) {
			if (process.platform === 'darwin') {
				clipboard.writeBuffer('public.png', Buffer.from(source))
				return
			}

			clipboard.writeImage(nativeImage.createFromBuffer(Buffer.from(source)))
			return
		}

		const image = normalizeImage(source)

		// 复制图片到剪贴板
		clipboard.writeImage(image)
	} catch (error) {
		console.error('复制图片失败:', error)
	}
}

/**
 * 将 base64 图片 另存为
 */
export async function saveImageToSystem(
	imageSource: string | Uint8Array | NativeImage,
	instance: BrowserWindow,
) {
	try {
		const ext = 'png'

		// 3. 弹出保存对话框
		const { filePath, canceled } = await dialog.showSaveDialog(instance, {
			title: '保存图片',
			defaultPath: path.join(
				os.homedir(), // 修复：require 改为 import
				'Pictures',
				`image_${Date.now()}.${ext}`,
			),
			filters: [
				{ name: `${ext.toUpperCase()} 图片`, extensions: [ext] },
				{ name: 'PNG 图片', extensions: ['png'] },
				{ name: 'JPEG 图片', extensions: ['jpg', 'jpeg'] },
				{ name: '所有文件', extensions: ['*'] },
			],
			properties: ['createDirectory', 'showOverwriteConfirmation'],
		})

		if (canceled || !filePath) {
			return { success: false, message: '用户取消保存' }
		}

		const imageBuffer = isRawPngBuffer(imageSource)
			? Buffer.from(imageSource)
			: normalizeImage(imageSource).toPNG()

		// 5. 写入文件
		await fs.promises.writeFile(filePath, imageBuffer)

		return {
			success: true,
			path: filePath,
			message: '图片保存成功',
		}
	} catch (error) {
		console.error('保存图片失败:', error)
		let errorMessage = '保存图片失败'
		if (error instanceof Error) {
			errorMessage = error.message || errorMessage
		}
		return {
			success: false,
			message: errorMessage,
		}
	}
}
