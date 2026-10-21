import { detectQuickResult, TQuickResult } from '@/pages/base/utils/quickTools'

export type TDevToolCategory =
	| 'timestamp'
	| 'radix'
	| 'color'
	| 'base64'
	| 'hash'

export type TDevToolMeta = {
	id: TDevToolCategory
	name: string
	description: string
	/** 输入框占位符，直接给出可用的示例 */
	placeholder: string
	/** 分类页里补全的命令前缀；时间戳这类没有命令词的为 null */
	command: string | null
	/** 点击「试试示例」预填的内容 */
	sample: string
}

/** 每个工具一个独立入口，这里的顺序只影响查找，不影响首页排列 */
const DEV_TOOL_CATEGORIES: TDevToolMeta[] = [
	{
		id: 'timestamp',
		name: '时间戳',
		description: '秒 / 毫秒时间戳转本地时间，并给出相对现在的间隔',
		placeholder: '1716000000 或 1716000000000',
		command: null,
		sample: '1716000000',
	},
	{
		id: 'radix',
		name: '进制转换',
		description: '二进制 / 八进制 / 十六进制互转，附带字符视图',
		placeholder: '0xff',
		command: null,
		sample: '0xff',
	},
	{
		id: 'color',
		name: '颜色转换',
		description: 'HEX / RGB / HSL 互相转换，顶部是实际色块',
		placeholder: '#1E90FF',
		command: null,
		sample: '#1E90FF',
	},
	{
		id: 'base64',
		name: 'Base64',
		description: '编码与解码，支持中文与 emoji',
		placeholder: 'hello',
		command: 'base64',
		sample: 'hello',
	},
	{
		id: 'hash',
		name: '哈希',
		description: 'MD5 / SHA-256 / SHA-512，纯本地计算',
		placeholder: 'hello',
		command: 'md5',
		sample: 'hello',
	},
]

export function getDevToolMeta(category: TDevToolCategory) {
	return DEV_TOOL_CATEGORIES.find(item => item.id === category)!
}

/** 每个分类只接受自己那一类结果，避免拿到不相干的结果 */
const CATEGORY_KIND_MATCH: Record<TDevToolCategory, (kind: string) => boolean> = {
	timestamp: kind => kind === '时间戳',
	radix: kind => kind === '进制转换',
	color: kind => kind === '颜色转换',
	base64: kind => kind.startsWith('Base64'),
	hash: kind => kind === 'MD5' || kind.startsWith('SHA'),
}

/**
 * 单个工具页内的解析：先按原样识别，识别不到再补上该工具的命令前缀重试。
 * 这样在 Base64 页里只敲 `hello` 也能出结果，不用记命令词。
 */
export function resolveCategoryInput(
	category: TDevToolCategory,
	rawInput: string,
): TQuickResult | null {
	const input = rawInput.trim()
	if (!input) return null

	const matcher = CATEGORY_KIND_MATCH[category]
	const direct = detectQuickResult(input)

	if (direct && matcher(direct.kind)) return direct

	const meta = getDevToolMeta(category)
	if (!meta.command) return null

	/** 用户已经带了命令词就不再重复拼接 */
	if (new RegExp(`^${meta.command}\\s`, 'i').test(input)) return null

	const withCommand = detectQuickResult(`${meta.command} ${input}`)
	return withCommand && matcher(withCommand.kind) ? withCommand : null
}

/** 没出结果时按当前工具给出更具体的提示 */
export function describeEmptyReason(
	category: TDevToolCategory,
	input: string,
): string {
	if (!input.trim()) return '在上方输入内容，结果会实时出现'

	if (category === 'base64') return '不是有效的 Base64，或解码后不是 UTF-8 文本'
	if (category === 'timestamp') return '时间戳需要 10 位（秒）或 13 位（毫秒）'
	if (category === 'radix') return '请以 0b / 0o / 0x 开头，例如 0xff'
	if (category === 'color') return '请使用 #RGB / #RRGGBB / #RRGGBBAA 格式'
	return '没有识别到可转换的内容'
}
