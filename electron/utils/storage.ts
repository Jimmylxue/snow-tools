import { BrowserWindow, clipboard, dialog, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'
/**
 * 将base64 图片存入剪切板
 */
export function copyImageToClipboard(source: string) {
	try {
		const base64Data = source
		// 移除 Base64 前缀（如果有）
		const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')

		// 创建 NativeImage 实例
		const image = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'))

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
	base64Data: string,
	instance: BrowserWindow
) {
	try {
		// 1. 验证 base64 数据
		if (
			!base64Data ||
			typeof base64Data !== 'string' ||
			!base64Data.startsWith('data:image/')
		) {
			throw new Error('无效的图片数据格式')
		}

		// 2. 提取图片类型
		const matches = base64Data.match(/^data:image\/(\w+);base64,/)
		if (!matches || matches.length < 2) {
			throw new Error('无法识别图片类型')
		}
		const imageType = matches[1]
		const ext = imageType === 'jpeg' ? 'jpg' : imageType

		// 3. 弹出保存对话框
		const { filePath, canceled } = await dialog.showSaveDialog(instance, {
			title: '保存图片',
			defaultPath: path.join(
				os.homedir(), // 修复：require 改为 import
				'Pictures',
				`image_${Date.now()}.${ext}`
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

		// 4. 移除 base64 前缀并转换为 Buffer
		const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '')
		const imageBuffer = Buffer.from(base64Image, 'base64')

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
