import { md5, sha256, sha512 } from './hash'

/**
 * 启动器里的「多路快捷工具」。
 *
 * 设计上沿用算式那套约定：给一段输入，要么返回 null（不归我管，交给搜索），
 * 要么返回一张结果卡（标题 + 若干可复制的行）。每个探测器互相独立，
 * 谁先命中算谁的，顺序即优先级。
 */

export type TQuickResultRow = {
	label: string
	value: string
}

export type TQuickResult = {
	/** 结果卡左上角的分类名，如「时间戳」「进制转换」 */
	kind: string
	/** 展示在输入原文位置的一行摘要 */
	expression: string
	/** 主结果，回车直接复制的就是它 */
	value: string
	/** 附加行，点击可单独复制 */
	rows: TQuickResultRow[]
	/** 颜色类结果的预览色，用于在卡片上显示色块 */
	swatch?: string
}

const TIMESTAMP_SECONDS = /^\d{10}$/
const TIMESTAMP_MILLIS = /^\d{13}$/
const BINARY = /^0b[01]+$/i
const OCTAL = /^0o[0-7]+$/i
const HEX = /^0x[0-9a-f]+$/i
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
const BASE64_TEXT = /^base64\s+(.+)$/i
const BASE64_DECODE = /^unbase64\s+(.+)$/i
const MD5_COMMAND = /^md5\s+(.+)$/i
const SHA256_COMMAND = /^sha256\s+(.+)$/i
const SHA512_COMMAND = /^sha512\s+(.+)$/i

/** 时间戳换算成常见可读格式，用本机时区，和用户认知一致 */
function describeTimestamp(input: string): TQuickResult | null {
	const isMillis = TIMESTAMP_MILLIS.test(input)
	if (!isMillis && !TIMESTAMP_SECONDS.test(input)) return null

	/** 13 位按毫秒，10 位按秒，与常见后端约定一致 */
	const timestamp = isMillis ? Number(input) : Number(input) * 1000
	const date = new Date(timestamp)
	if (Number.isNaN(date.getTime())) return null

	const pad = (value: number) => String(value).padStart(2, '0')
	const local = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate(),
	)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
		date.getSeconds(),
	)}`

	/** 顺手给出「多久之前 / 之后」，判断时间戳是否合理时很有用 */
	const diff = Date.now() - timestamp
	const abs = Math.abs(diff)
	const units: Array<[number, string]> = [
		[365 * 24 * 3600 * 1000, '年'],
		[30 * 24 * 3600 * 1000, '月'],
		[24 * 3600 * 1000, '天'],
		[3600 * 1000, '小时'],
		[60 * 1000, '分钟'],
		[1000, '秒'],
	]
	const unit = units.find(([size]) => abs >= size)
	const relative = unit
		? `${Math.floor(abs / unit[0])} ${unit[1]}${diff >= 0 ? '前' : '后'}`
		: '刚刚'

	const timezone = -date.getTimezoneOffset() / 60
	const timezoneLabel = `UTC${timezone >= 0 ? '+' : ''}${timezone}`

	return {
		kind: '时间戳',
		expression: `${isMillis ? '毫秒' : '秒'} ${input}`,
		value: local,
		rows: [
			{ label: '本地时间', value: local },
			{ label: 'ISO 8601', value: date.toISOString() },
			{ label: '日期', value: local.slice(0, 10) },
			{ label: '时间', value: local.slice(11) },
			{ label: '时区', value: timezoneLabel },
			{ label: '相对现在', value: relative },
		],
	}
}

/** 进制转换：二进制 / 八进制 / 十六进制互相换算，顺带给出字符视图 */
function describeRadix(input: string): TQuickResult | null {
	let value: number
	let sourceLabel: string

	if (BINARY.test(input)) {
		value = Number.parseInt(input.slice(2), 2)
		sourceLabel = '二进制'
	} else if (OCTAL.test(input)) {
		value = Number.parseInt(input.slice(2), 8)
		sourceLabel = '八进制'
	} else if (HEX.test(input)) {
		value = Number.parseInt(input.slice(2), 16)
		sourceLabel = '十六进制'
	} else {
		return null
	}

	if (!Number.isSafeInteger(value)) return null

	/**
	 * 只在码点确实对应可见字符时才给出字符行：
	 * 0x20 以下是控制字符，0x7F 是 DEL，trim 后为空说明是空格类，
	 * '\ufffd' 说明码点本身无效。
	 */
	const charView =
		value >= 0x20 && value !== 0x7f && value <= 0x10ffff
			? String.fromCodePoint(value)
			: ''
	const printable =
		charView && charView.trim() && charView !== '\ufffd' ? charView : ''

	return {
		kind: '进制转换',
		expression: `${sourceLabel} ${input}`,
		value: String(value),
		rows: [
			{ label: '十进制', value: String(value) },
			{ label: '二进制', value: `0b${value.toString(2)}` },
			{ label: '八进制', value: `0o${value.toString(8)}` },
			{ label: '十六进制', value: `0x${value.toString(16).toUpperCase()}` },
			...(printable ? [{ label: '字符', value: printable }] : []),
		],
	}
}

function hexToRgb(hex: string) {
	const raw =
		hex.length <= 5
			? hex
					.slice(1)
					.split('')
					.map(char => char + char)
					.join('')
			: hex.slice(1)

	const expanded =
		raw.length === 6 || raw.length === 8 ? raw : raw.padEnd(6, 'f').slice(0, 6)

	return {
		r: Number.parseInt(expanded.slice(0, 2), 16),
		g: Number.parseInt(expanded.slice(2, 4), 16),
		b: Number.parseInt(expanded.slice(4, 6), 16),
		a:
			expanded.length === 8
				? Number.parseInt(expanded.slice(6, 8), 16) / 255
				: 1,
	}
}

function rgbToHsl(r: number, g: number, b: number) {
	const red = r / 255
	const green = g / 255
	const blue = b / 255
	const max = Math.max(red, green, blue)
	const min = Math.min(red, green, blue)
	const lightness = (max + min) / 2

	if (max === min) {
		return { h: 0, s: 0, l: Math.round(lightness * 100) }
	}

	const delta = max - min
	const saturation =
		lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)

	let hue: number
	if (max === red) {
		hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6
	} else if (max === green) {
		hue = ((blue - red) / delta + 2) / 6
	} else {
		hue = ((red - green) / delta + 4) / 6
	}

	return {
		h: Math.round(hue * 360),
		s: Math.round(saturation * 100),
		l: Math.round(lightness * 100),
	}
}

/** 颜色格式互转，顺手给出色块预览用的原始值 */
function describeColor(input: string): TQuickResult | null {
	if (!HEX_COLOR.test(input)) return null

	const { r, g, b, a } = hexToRgb(input)
	const hsl = rgbToHsl(r, g, b)
	const alpha = Math.round(a * 100) / 100
	const rgbText =
		alpha >= 1
			? `rgb(${r}, ${g}, ${b})`
			: `rgba(${r}, ${g}, ${b}, ${alpha})`

	return {
		kind: '颜色转换',
		expression: input.toUpperCase(),
		value: rgbText,
		swatch: input,
		rows: [
			{ label: 'HEX', value: input.toUpperCase() },
			{ label: 'RGB', value: rgbText },
			{ label: 'HSL', value: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)` },
			{ label: '数值', value: `0x${input.slice(1).toUpperCase()}` },
		],
	}
}

function bytesToHex(bytes: Uint8Array) {
	return Array.from(bytes)
		.map(byte => byte.toString(16).padStart(2, '0'))
		.join('')
}

/** Base64 编解码，同时给出编码后的字节数与长度，方便确认结果 */
function describeBase64(input: string): TQuickResult | null {
	const encodeMatch = input.match(BASE64_TEXT)
	if (encodeMatch) {
		const text = encodeMatch[1]
		const bytes = new TextEncoder().encode(text)

		/** btoa 只接受 latin1，先用 UTF-8 字节转成二进制字符串 */
		const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
		const encoded = btoa(binary)

		return {
			kind: 'Base64 编码',
			expression: text,
			value: encoded,
			rows: [
				{ label: 'Base64', value: encoded },
				{ label: 'UTF-8 字节', value: String(bytes.length) },
				{ label: '十六进制', value: bytesToHex(bytes) },
			],
		}
	}

	const decodeMatch = input.match(BASE64_DECODE)
	if (decodeMatch) {
		const raw = decodeMatch[1].trim()

		try {
			const binary = atob(raw)
			const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
			const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)

			return {
				kind: 'Base64 解码',
				expression: raw,
				value: decoded,
				rows: [
					{ label: '文本', value: decoded },
					{ label: '字节数', value: String(bytes.length) },
					{ label: '十六进制', value: bytesToHex(bytes) },
				],
			}
		} catch {
			return null
		}
	}

	return null
}

/** 哈希：md5 / sha256 / sha512 三个命令共用一套返回结构 */
function describeHash(input: string): TQuickResult | null {
	const commands: Array<{
		pattern: RegExp
		kind: string
		run: (text: string) => string
	}> = [
		{ pattern: MD5_COMMAND, kind: 'MD5', run: md5 },
		{ pattern: SHA256_COMMAND, kind: 'SHA-256', run: sha256 },
		{ pattern: SHA512_COMMAND, kind: 'SHA-512', run: sha512 },
	]

	for (const command of commands) {
		const match = input.match(command.pattern)
		if (!match) continue

		const text = match[1]
		const digest = command.run(text)

		return {
			kind: command.kind,
			expression: text,
			value: digest,
			rows: [
				{ label: command.kind, value: digest },
				{ label: '大写', value: digest.toUpperCase() },
				{ label: '字符数', value: String(text.length) },
			],
		}
	}

	return null
}

/**
 * 依次尝试各探测器，返回第一个命中的结果。
 * 顺序有讲究：命令式（base64 / md5）必须排在最前面，
 * 否则 `base64 1234` 会被误判成进制或时间戳。
 */
export function detectQuickResult(rawInput: string): TQuickResult | null {
	const input = rawInput.trim()
	if (!input) return null

	const detectors = [
		describeHash,
		describeBase64,
		describeTimestamp,
		describeColor,
		describeRadix,
	]

	for (const detect of detectors) {
		const result = detect(input)
		if (result) return result
	}

	return null
}

