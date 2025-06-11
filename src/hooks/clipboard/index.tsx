import { getClipboardList, saveClipboardItem } from './db'

export function bindClipBoardChange() {
	// window.ipcRenderer.on('CLIPBOARD_CHANGED', async (_, content) => {
	// 	await saveClipboardItem(content)
	// 	// 更新UI等操作
	// })

	getClipboardList({ page: 1, pageSize: 20 }).then(res =>
		console.log('res', res)
	)
}
