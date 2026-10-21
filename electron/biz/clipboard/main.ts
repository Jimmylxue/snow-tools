import { createRequire } from 'module'
import { BrowserWindow, clipboard, ipcMain } from 'electron'
import path from 'path'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'url'
import { copyCallBack } from './core'
import { debounce } from 'lodash-es'
import {
	clearAllImages,
	createThumbnail,
	getImageStats,
	pruneImages,
	resolveImagePath,
} from './images'
import { copyImageToClipboard } from '../../utils/storage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const require = createRequire(import.meta.url)

/**
 * 采集回调现在是异步的（要做图片落盘），
 * debounce 不处理 Promise，这里显式 catch 掉失败，避免未捕获拒绝。
 */
const debouncedCopyCallBack = debounce(
	(mainWindow: BrowserWindow, text: string) => {
		void copyCallBack(mainWindow, text).catch(error => {
			console.error('采集剪贴板失败:', error)
		})
	},
	1000,
)

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

let ipcRegistered = false

/**
 * 图片相关 IPC 只注册一次。
 * 渲染进程拿不到原图：要么按文件名要缩略图，要么让主进程把原图写回剪贴板。
 */
function registerClipboardIpc() {
	if (ipcRegistered) return
	ipcRegistered = true

	ipcMain.handle('CLIPBOARD_IMAGE_THUMBNAIL', async (_, fileName: unknown) => {
		if (typeof fileName !== 'string') return null

		const target = resolveImagePath(fileName)
		if (!target) return null

		const buffer = await fs.readFile(target).catch(() => null)
		if (!buffer) return null

		const thumbnail = createThumbnail(buffer)

		/**
		 * 返回 data URL：渲染层直接塞进 <img src>，
		 * 不用再管 blob URL 的创建与回收。
		 */
		return thumbnail
			? `data:image/png;base64,${thumbnail.toString('base64')}`
			: null
	})

	ipcMain.handle('CLIPBOARD_IMAGE_STATS', () => getImageStats())

	/** keepFileNames 传收藏项，保证「清空图片」不会误删用户的收藏 */
	ipcMain.handle(
		'CLIPBOARD_IMAGE_CLEAR',
		async (_, keepFileNames: unknown) => {
			const keep = Array.isArray(keepFileNames)
				? keepFileNames.filter((item): item is string => typeof item === 'string')
				: []

			return clearAllImages(new Set(keep))
		},
	)

	/** 把磁盘上的原图写回系统剪贴板，用于点击历史里的图片 */
	ipcMain.handle('CLIPBOARD_IMAGE_COPY', async (_, fileName: unknown) => {
		if (typeof fileName !== 'string') return { ok: false }

		const target = resolveImagePath(fileName)
		if (!target) return { ok: false }

		const buffer = await fs.readFile(target).catch(() => null)
		if (!buffer) return { ok: false }

		copyImageToClipboard(new Uint8Array(buffer))
		return { ok: true }
	})

	/**
	 * 由渲染层驱动的一次全量清理：
	 * 传进来「仍被引用」和「已收藏」的文件名，主进程据此回收磁盘。
	 */
	ipcMain.handle(
		'CLIPBOARD_PRUNE_IMAGES',
		async (
			_,
			payload: {
				referencedFileNames?: unknown
				keepFileNames?: unknown
			},
		) => {
			const toStringArray = (value: unknown) =>
				Array.isArray(value)
					? value.filter((item): item is string => typeof item === 'string')
					: []

			return pruneImages({
				referencedFileNames: new Set(toStringArray(payload?.referencedFileNames)),
				keepFileNames: new Set(toStringArray(payload?.keepFileNames)),
			})
		},
	)
}

/**
 * 剪贴板变化轮询。
 *
 * 原生监听器只识别「物理按下 Cmd+C」，而图片进入剪贴板的方式很多：
 * 系统截图（Cmd+Shift+4）、右键菜单复制、其他应用内部写入……
 * 这些都不会触发监听器，图片就永远采集不到。
 * 所以用一次轻量轮询兜底，作为更可靠的变化来源。
 */
let pollTimer: NodeJS.Timeout | null = null
let lastFingerprint = ''

/**
 * 剪贴板指纹：格式列表 + 文本内容哈希 +（有图片时的）图片尺寸。
 *
 * Electron 没有暴露 changeCount，这个组合足以覆盖常见变化。
 * 文本用哈希而不是长度，否则「hello」换成「world」这种同长度替换会被漏掉。
 * 只在格式里确实有图片时才调 readImage：它会解码整张图，
 * 每 1.5 秒无条件解码一次在复制大图后会有明显开销。
 */
function readFingerprint() {
	const formats = clipboard.availableFormats()
	const hasImage = formats.some(format => format.startsWith('image/'))
	const text = clipboard.readText()

	const textHash = text
		? createHash('sha1').update(text).digest('hex').slice(0, 16)
		: ''

	const size = hasImage
		? (() => {
				const image = clipboard.readImage()
				if (image.isEmpty()) return ''
				const { width, height } = image.getSize()
				return `${width}x${height}`
			})()
		: ''

	return `${formats.join(',')}|${textHash}|${size}`
}

export function startClipboardPolling(mainWindow: BrowserWindow) {
	if (pollTimer) return

	lastFingerprint = readFingerprint()

	pollTimer = setInterval(() => {
		if (mainWindow.isDestroyed()) {
			stopClipboardPolling()
			return
		}

		const fingerprint = readFingerprint()
		if (fingerprint === lastFingerprint) return

		lastFingerprint = fingerprint
		debouncedCopyCallBack(mainWindow, clipboard.readText())
	}, 1500)
}

function stopClipboardPolling() {
	if (pollTimer) {
		clearInterval(pollTimer)
		pollTimer = null
	}
}

export function initClipboard(mainWindow: BrowserWindow) {
	console.log('尝试启动剪切板监听...')

	registerClipboardIpc()

	/** 图片与截图复制都依赖轮询，必须始终启动，不能只看原生监听是否成功 */
	startClipboardPolling(mainWindow)

	mainWindow.on('closed', stopClipboardPolling)

	try {
		const Fn = () => {
			try {
				setTimeout(() => {
					debouncedCopyCallBack(mainWindow, clipboard.readText())
				}, 300)
			} catch (err) {
				console.error('读取剪切板失败:', err)
			}
		}
		nsevent.stopListening(Fn)
		const success = nsevent.startListening(Fn)
		console.log('监听启动结果:', success)
	} catch (err) {
		/** 原生监听失败不影响轮询兜底 */
		console.error('监听启动失败:', err)
	}
}
