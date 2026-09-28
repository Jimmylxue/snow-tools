import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { app, ipcMain, shell } from 'electron'
import { TApp } from './type'
import { getLocalAppName } from './utils'

const execFileAsync = promisify(execFile)

const APP_DIRS = ['/Applications', path.join(os.homedir(), 'Applications')]
const ICON_SIZE = 64
/** 每个应用要起 PlistBuddy / mdls 进程，限制并发 */
const READ_CONCURRENCY = 8

let cachedApps: TApp[] | null = null

function exists(target: string) {
	return fs.stat(target).then(
		() => true,
		() => false,
	)
}

function isInstalledAppPath(appPath: string) {
	return (
		appPath.endsWith('.app') &&
		APP_DIRS.some(dir => appPath.startsWith(`${dir}/`))
	)
}

function iconCacheDir() {
	return path.join(app.getPath('userData'), 'appIcons')
}

/** .app 目录名可以带空格等字符，缓存文件名做一次兜底清洗 */
function iconCacheName(originAppName: string) {
	return `${originAppName.replace(/[^\w.-]/g, '_')}.png`
}

async function findIconSource(appPath: string) {
	const resourcesDir = path.join(appPath, 'Contents/Resources')
	const plistPath = path.join(appPath, 'Contents/Info.plist')
	let declared = ''

	try {
		const { stdout } = await execFileAsync('/usr/libexec/PlistBuddy', [
			'-c',
			'Print :CFBundleIconFile',
			plistPath,
		])
		declared = stdout.trim()
	} catch {
		// 少数包不写这个键，退回扫描 Resources
	}

	const candidates = declared
		? [
				path.join(resourcesDir, declared),
				path.join(
					resourcesDir,
					declared.endsWith('.icns') ? declared : `${declared}.icns`,
				),
			]
		: []

	for (const candidate of candidates) {
		if (await exists(candidate)) {
			return candidate
		}
	}

	const names = await fs.readdir(resourcesDir).catch(() => [])
	const fallback = names.find(name => name.endsWith('.icns'))

	return fallback ? path.join(resourcesDir, fallback) : ''
}

/**
 * nativeImage 和 app.getFileIcon 都拿不到真实应用图标（前者解不了 .icns，
 * 后者返回同一张占位图），所以用 sips 转成 PNG 缓存在 userData 下。
 */
async function readIconDataUrl(appPath: string, originAppName: string) {
	const dir = iconCacheDir()
	const pngPath = path.join(dir, iconCacheName(originAppName))
	const [cachedStat, bundleStat] = await Promise.all([
		fs.stat(pngPath).catch(() => null),
		fs.stat(appPath).catch(() => null),
	])
	/** 应用更新后包体 mtime 变新，缓存跟着重转，图标不会一直旧 */
	const cacheFresh =
		!!cachedStat && (!bundleStat || cachedStat.mtimeMs >= bundleStat.mtimeMs)

	if (!cacheFresh) {
		const source = await findIconSource(appPath)

		if (!source) {
			return ''
		}

		await fs.mkdir(dir, { recursive: true })

		try {
			await execFileAsync('sips', [
				'-s',
				'format',
				'png',
				'-Z',
				String(ICON_SIZE),
				source,
				'--out',
				pngPath,
			])
		} catch (error) {
			console.warn('转换应用图标失败:', originAppName, error)
			return ''
		}
	}

	const png = await fs.readFile(pngPath).catch(() => null)

	return png ? `data:image/png;base64,${png.toString('base64')}` : ''
}

async function listAppBundles() {
	const batches = await Promise.all(
		APP_DIRS.map(async dir => {
			const names = await fs.readdir(dir).catch(() => [])

			return names
				.filter(name => name.endsWith('.app') && !name.startsWith('.'))
				.map(name => path.join(dir, name))
		}),
	)

	return batches.flat()
}

async function readApp(appPath: string): Promise<TApp> {
	const originAppName = path.basename(appPath, '.app')
	const [iconUrl, appName] = await Promise.all([
		readIconDataUrl(appPath, originAppName),
		getLocalAppName(appPath, originAppName),
	])

	return { appName, originAppName, iconUrl, appPath }
}

async function mapWithConcurrency<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>,
) {
	const results: R[] = []
	let cursor = 0

	const workers = Array.from(
		{ length: Math.min(limit, items.length) },
		async () => {
			while (cursor < items.length) {
				const index = cursor++
				results[index] = await fn(items[index])
			}
		},
	)

	await Promise.all(workers)

	return results
}

async function getInstalledApps() {
	if (!cachedApps) {
		const appBundles = await listAppBundles()

		cachedApps = await mapWithConcurrency(
			appBundles,
			READ_CONCURRENCY,
			readApp,
		)
	}

	return cachedApps
}

export function initApps() {
	ipcMain.handle('getInstalledApps', () => getInstalledApps())

	ipcMain.on('OPEN_APP', (_, appPath: string) => {
		/** 只允许打开应用目录下的 .app，避免渲染进程传入任意路径 */
		if (!isInstalledAppPath(appPath)) {
			console.warn('拒绝打开非应用目录下的路径:', appPath)
			return
		}

		void shell.openPath(appPath)
	})
}
