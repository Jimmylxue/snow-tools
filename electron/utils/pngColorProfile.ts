import { deflateSync } from 'node:zlib'
import fs from 'node:fs'

const PNG_SIGNATURE = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
])
const DISPLAY_P3_ICC_PATH = '/System/Library/ColorSync/Profiles/Display P3.icc'
/** 与 macOS 自带截图写出的 cICP 完全一致（P3 原色 + sRGB 传递函数 + GBR + full range） */
const DISPLAY_P3_CICP = Buffer.from([12, 13, 0, 1])
/** 已有这些块就不能再插，否则描述文件会互相打架 */
const COLOR_CHUNKS = new Set(['iCCP', 'cICP', 'sRGB', 'gAMA', 'cHRM'])

const CRC_TABLE = new Uint32Array(256).map((_, index) => {
	let crc = index
	for (let bit = 0; bit < 8; bit += 1) {
		crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
	}
	return crc >>> 0
})

function crc32(buffer: Buffer) {
	let crc = 0xffffffff
	for (const byte of buffer) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
	}
	return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type: string, data: Buffer) {
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
	const chunk = Buffer.allocUnsafe(12 + data.length)

	chunk.writeUInt32BE(data.length, 0)
	body.copy(chunk, 4)
	chunk.writeUInt32BE(crc32(body), 8 + data.length)

	return chunk
}

let cachedIccProfile: Buffer | null | undefined

function readDisplayP3Icc() {
	if (cachedIccProfile === undefined) {
		try {
			cachedIccProfile = fs.readFileSync(DISPLAY_P3_ICC_PATH)
		} catch {
			cachedIccProfile = null
		}
	}

	return cachedIccProfile
}

/**
 * nativeImage.toPNG() 写出的 PNG 不带任何色彩描述文件，
 * 屏幕原始像素（Display P3）会被当成 sRGB 再转换一次，截图看起来发灰。
 * 这里按 macOS 截图的做法补上 iCCP + cICP。
 */
export function tagPngDisplayP3(png: Uint8Array): Uint8Array {
	const buffer = Buffer.from(png.buffer, png.byteOffset, png.byteLength)
	const icc = readDisplayP3Icc()

	if (!icc || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
		return png
	}

	let offset = PNG_SIGNATURE.length
	let insertAt = -1

	while (offset + 12 <= buffer.length) {
		const length = buffer.readUInt32BE(offset)
		const type = buffer.toString('ascii', offset + 4, offset + 8)

		/** iCCP 必须在 IDAT 之前，所以记下 IHDR 之后的位置就够了 */
		if (insertAt === -1) {
			if (type !== 'IHDR') {
				return png
			}
			insertAt = offset + 12 + length
		}

		if (COLOR_CHUNKS.has(type)) {
			return png
		}

		if (type === 'IDAT' || type === 'IEND') {
			break
		}

		offset += 12 + length
	}

	const iccp = createChunk(
		'iCCP',
		Buffer.concat([
			Buffer.from('Display P3', 'latin1'),
			Buffer.from([0, 0]),
			deflateSync(icc),
		]),
	)

	return new Uint8Array(
		Buffer.concat([
			buffer.subarray(0, insertAt),
			iccp,
			createChunk('cICP', DISPLAY_P3_CICP),
			buffer.subarray(insertAt),
		]),
	)
}
