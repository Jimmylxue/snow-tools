import {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	type IpcMainInvokeEvent,
	type OpenDialogOptions,
	type SaveDialogOptions,
} from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import type { TJsonOpenFileResult, TJsonSaveFileResult } from './type'

const MAX_FILE_SIZE = 5 * 1024 * 1024

let initialized = false

function getParentWindow(event: IpcMainInvokeEvent) {
	return BrowserWindow.fromWebContents(event.sender) ?? undefined
}

export function initJsonTool() {
	if (initialized) return
	initialized = true

	ipcMain.handle(
		'JSON_OPEN_FILE',
		async (event): Promise<TJsonOpenFileResult> => {
			const parent = getParentWindow(event)
			const options: OpenDialogOptions = {
				title: '打开 JSON 文件',
				properties: ['openFile'],
				filters: [
					{ name: 'JSON 文件', extensions: ['json', 'txt', 'log'] },
					{ name: '所有文件', extensions: ['*'] },
				],
			}
			const { canceled, filePaths } = parent
				? await dialog.showOpenDialog(parent, options)
				: await dialog.showOpenDialog(options)

			if (canceled || !filePaths[0]) {
				return { canceled: true }
			}

			const filePath = filePaths[0]
			const stats = await fs.stat(filePath)
			if (stats.size > MAX_FILE_SIZE) {
				throw new Error('文件超过 5MB，暂不支持')
			}

			const content = await fs.readFile(filePath, 'utf8')
			return {
				canceled: false,
				fileName: path.basename(filePath),
				content,
				size: stats.size,
			}
		},
	)

	ipcMain.handle(
		'JSON_SAVE_FILE',
		async (
			event,
			payload: { defaultName?: string; content?: string },
		): Promise<TJsonSaveFileResult> => {
			if (!payload || typeof payload.content !== 'string') {
				throw new Error('导出内容不完整')
			}

			const requested = payload.defaultName || `data-${Date.now()}.json`
			const extension = path.extname(requested).replace('.', '') || 'json'
			const safeName = requested.replace(/[\\/:*?"<>|]/g, '-')
			const parent = getParentWindow(event)
			const options: SaveDialogOptions = {
				title: '导出文件',
				defaultPath: path.join(app.getPath('desktop'), safeName),
				filters: [
					extension === 'ts'
						? { name: 'TypeScript 文件', extensions: ['ts'] }
						: { name: 'JSON 文件', extensions: ['json'] },
					{ name: '所有文件', extensions: ['*'] },
				],
			}
			const { canceled, filePath } = parent
				? await dialog.showSaveDialog(parent, options)
				: await dialog.showSaveDialog(options)

			if (canceled || !filePath) {
				return { canceled: true }
			}

			await fs.writeFile(filePath, payload.content, 'utf8')
			return { canceled: false, filePath }
		},
	)
}
