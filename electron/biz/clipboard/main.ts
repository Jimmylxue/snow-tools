import { createRequire } from 'module'
import { BrowserWindow, clipboard } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyCallBack } from './core'
import { debounce } from 'lodash-es'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const require = createRequire(import.meta.url)
console.log('import.meta.url', import.meta.url)

// 创建防抖版本的 copyCallBack
const debouncedCopyCallBack = debounce(copyCallBack, 1000)

// 根据开发环境和生产环境获取正确的路径
const getNativeModulePath = () => {
	if (process.env.NODE_ENV === 'development') {
		return path.join(
			__dirname,
			'../electron/modules/nsevent-listener/build/Release/nsevent_listener.node'
		)
	}
	return path.join(
		process.resourcesPath,
		'electron/modules/nsevent-listener/build/Release/nsevent_listener.node'
	)
}

const nsevent = require(getNativeModulePath())

export function initClipboard(mainWindow: BrowserWindow) {
	console.log('尝试启动剪切板监听...')

	try {
		const success = nsevent.startListening(() => {
			try {
				const text = clipboard.readText()
				debouncedCopyCallBack(mainWindow, text)
			} catch (err) {
				console.error('读取剪切板失败:', err)
			}
		})

		console.log('监听启动结果:', success)
	} catch (err) {
		console.error('监听启动失败:', err)
	}
}
