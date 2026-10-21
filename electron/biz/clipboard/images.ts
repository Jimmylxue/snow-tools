import { app, clipboard, nativeImage } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { TClipboardImageStats, TCopyImageMeta } from './type'

/**
 * 剪贴板图片的落盘与清理。
 *
 * 为什么不存 IndexedDB：那里面的数据会常驻渲染进程内存，
 * 一张 Retina 截图动辄几 MB，攒几十张就是几百 MB 的常驻占用。
 * 所以这里只把图片写进磁盘，数据库里存文件名等元数据，列表用缩略图渲染。
 */

/** 目录名放在 userData 下，卸载重装也随应用数据一起清掉 */
const IMAGE_DIR_NAME = 'clipboard-images'

/** 缩略图最长边，用于列表展示，避免把原图整张读进渲染进程 */
export const THUMBNAIL_MAX_EDGE = 320

/** 单张图片允许落盘的最大体积，超过直接跳过，防止极端大图撑爆磁盘 */
export const MAX_SINGLE_IMAGE_BYTES = 12 * 1024 * 1024

/** 图片总量上限：超过就按时间从旧到新删，收藏的始终跳过 */
export const MAX_TOTAL_IMAGE_BYTES = 120 * 1024 * 1024

/** 图片张数上限，和体积上限共同生效，防止大量小图拖慢列表 */
export const MAX_IMAGE_ITEMS = 200

/** 图片保留天数，和文本的 3 天保持一致 */
const IMAGE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000

/**
 * 超大图先缩到最长边 2560 再存。
 * 直接丢弃会让用户觉得「复制了却没记录」，缩一点至少留得下。
 */
const OVERSIZE_MAX_EDGE = 2560

function getImageDir() {
	return path.join(app.getPath('userData'), IMAGE_DIR_NAME)
}

async function ensureImageDir() {
	const dir = getImageDir()
	await fs.mkdir(dir, { recursive: true })
	return dir
}

/** 只允许访问这个目录下的文件，避免路径穿越读到别处 */
export function resolveImagePath(fileName: string) {
	const base = getImageDir()
	const resolved = path.resolve(base, fileName)

	if (!resolved.startsWith(path.resolve(base) + path.sep)) {
		return null
	}

	return resolved
}

function buildFileName(extension = 'png') {
	return `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
}

/**
 * 把剪贴板里的图片存到磁盘，返回可写进 IndexedDB 的元数据。
 * 图片本体永远不经过渲染进程，渲染层只按文件名要缩略图。
 */
export async function saveClipboardImage(
	source?: Electron.NativeImage,
): Promise<TCopyImageMeta | null> {
	const image = source ?? clipboard.readImage()
	if (image.isEmpty()) return null

	let buffer = image.toPNG()
	if (buffer.byteLength === 0) return null

	/**
	 * 单张图片过大时先等比缩小，而不是直接放弃。
	 * 复制一张超长截图什么都没记下来，比记录一张压缩过的更让人困惑。
	 */
	if (buffer.byteLength > MAX_SINGLE_IMAGE_BYTES) {
		const { width, height } = image.getSize()
		const longest = Math.max(width, height)
		const ratio =
			longest > OVERSIZE_MAX_EDGE
				? OVERSIZE_MAX_EDGE / longest
				: Math.sqrt(MAX_SINGLE_IMAGE_BYTES / buffer.byteLength)

		if (ratio >= 1) return null

		buffer = image
			.resize({
				width: Math.max(1, Math.round(width * ratio)),
				height: Math.max(1, Math.round(height * ratio)),
				quality: 'good',
			})
			.toPNG()

		if (buffer.byteLength > MAX_SINGLE_IMAGE_BYTES) return null
	}

	const stored = nativeImage.createFromBuffer(buffer)
	const { width, height } = stored.getSize()
	const dir = await ensureImageDir()
	const fileName = buildFileName()

	await fs.writeFile(path.join(dir, fileName), buffer)

	return {
		fileName,
		width,
		height,
		size: buffer.byteLength,
	}
}

/** 把任意图片缓冲写成缩略图，供渲染进程 <img> 直接用 */
export function createThumbnail(buffer: Buffer) {
	const image = nativeImage.createFromBuffer(buffer)
	if (image.isEmpty()) return null

	const { width, height } = image.getSize()
	const longest = Math.max(width, height)

	if (longest <= THUMBNAIL_MAX_EDGE) {
		return image.toPNG()
	}

	const ratio = THUMBNAIL_MAX_EDGE / longest

	return image
		.resize({
			width: Math.max(1, Math.round(width * ratio)),
			height: Math.max(1, Math.round(height * ratio)),
			quality: 'good',
		})
		.toPNG()
}

export async function deleteImageFile(fileName?: string) {
	if (!fileName) return

	const target = resolveImagePath(fileName)
	if (!target) return

	await fs.rm(target, { force: true }).catch(() => undefined)
}

type TStoredImage = {
	fileName: string
	size: number
	/** 文件 mtime，用于按时间清理 */
	mtimeMs: number
}

async function listStoredImages(): Promise<TStoredImage[]> {
	const dir = getImageDir()

	const entries = await fs.readdir(dir).catch(() => [] as string[])
	const images: TStoredImage[] = []

	for (const entry of entries) {
		if (!entry.endsWith('.png')) continue

		const fullPath = path.join(dir, entry)
		const stat = await fs.stat(fullPath).catch(() => null)
		if (!stat?.isFile()) continue

		images.push({ fileName: entry, size: stat.size, mtimeMs: stat.mtimeMs })
	}

	return images
}

/**
 * 清理决策（纯函数，便于单测）。
 *
 * 三重上限按顺序生效：
 * 1. 数据库里已无引用的孤儿文件；
 * 2. 超过保留天数的；
 * 3. 仍超出体积或张数上限时，从最旧的开始删。
 * 第 2、3 步都不会碰 keepFileNames（收藏项）。
 */
export function decidePrunePlan(options: {
	images: TStoredImage[]
	referencedFileNames: Set<string>
	keepFileNames: Set<string>
	now: number
}): { toDelete: TStoredImage[]; survivors: TStoredImage[] } {
	const { images, referencedFileNames, keepFileNames, now } = options

	const toDelete: TStoredImage[] = []
	const alive: TStoredImage[] = []

	/** 1. 孤儿文件 */
	for (const image of images) {
		const isOrphan = !referencedFileNames.has(image.fileName)
		const isProtected = keepFileNames.has(image.fileName)

		if (isOrphan && !isProtected) {
			toDelete.push(image)
			continue
		}

		alive.push(image)
	}

	/** 2. 超过保留天数 */
	const remaining: TStoredImage[] = []

	for (const image of alive) {
		const expired =
			!keepFileNames.has(image.fileName) && now - image.mtimeMs > IMAGE_MAX_AGE_MS

		if (expired) {
			toDelete.push(image)
			continue
		}

		remaining.push(image)
	}

	/** 3. 超出体积 / 张数上限，从最旧开始删 */
	const candidates = remaining
		.filter(image => !keepFileNames.has(image.fileName))
		.sort((a, b) => a.mtimeMs - b.mtimeMs)

	let totalBytes = remaining.reduce((sum, image) => sum + image.size, 0)
	let totalCount = remaining.length

	const overflowDeletes = new Set<TStoredImage>()

	for (const image of candidates) {
		const overBytes = totalBytes > MAX_TOTAL_IMAGE_BYTES
		const overCount = totalCount > MAX_IMAGE_ITEMS
		if (!overBytes && !overCount) break

		overflowDeletes.add(image)
		toDelete.push(image)
		totalBytes -= image.size
		totalCount -= 1
	}

	return {
		toDelete,
		survivors: remaining.filter(image => !overflowDeletes.has(image)),
	}
}

/**
 * 按「体积 + 张数 + 天数」三重上限清理图片。
 *
 * keepFileNames 里的文件（被收藏的条目）不会被删除，
 * 这样用户主动收藏的图不会因为容量策略被悄悄清掉。
 */
export async function pruneImages(options: {
	/** 仍被数据库引用的文件名；不在其中的孤儿文件会被直接清掉 */
	referencedFileNames: Set<string>
	keepFileNames: Set<string>
}) {
	const images = await listStoredImages()

	const { toDelete } = decidePrunePlan({
		images,
		referencedFileNames: options.referencedFileNames,
		keepFileNames: options.keepFileNames,
		now: Date.now(),
	})

	let removedBytes = 0

	for (const image of toDelete) {
		await fs.rm(path.join(getImageDir(), image.fileName), { force: true })
		removedBytes += image.size
	}

	return { removed: toDelete.length, removedBytes }
}

export async function getImageStats(): Promise<TClipboardImageStats> {
	const images = await listStoredImages()

	return {
		count: images.length,
		totalBytes: images.reduce((sum, image) => sum + image.size, 0),
		maxBytes: MAX_TOTAL_IMAGE_BYTES,
		maxItems: MAX_IMAGE_ITEMS,
	}
}

/**
 * 清空图片。keepFileNames 里的（收藏项）会被保留，
 * 和界面上「收藏项会被保留」的提示保持一致。
 */
export async function clearAllImages(keepFileNames: Set<string> = new Set()) {
	const images = await listStoredImages()
	const removable = images.filter(image => !keepFileNames.has(image.fileName))

	for (const image of removable) {
		await fs.rm(path.join(getImageDir(), image.fileName), { force: true })
	}

	return { removed: removable.length }
}
