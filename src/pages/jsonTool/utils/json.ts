export type TJsonIndent = '2' | '4' | 'tab'

export type TJsonSortOrder = 'none' | 'asc' | 'desc'

export type TJsonError = {
	/** 面向用户的中文提示 */
	message: string
	/** 原始解析错误，用于 hover 查看 */
	detail: string
	line: number
	column: number
	position: number
}

export type TJsonParseResult =
	| { ok: true; value: unknown }
	| { ok: false; error: TJsonError }

export type TJsonUnescapeResult =
	| { ok: true; text: string }
	| { ok: false; message: string }

const ERROR_MESSAGES: Array<[RegExp, string]> = [
	[/^Unexpected end of JSON input/i, 'JSON 内容不完整，可能缺少右括号或引号'],
	[/^Unterminated string/i, '字符串没有闭合'],
	[/^Expected double-quoted property name/i, '对象属性名格式不正确，可能是多余的逗号或缺少双引号'],
	[/^Expected property name or '}'/i, '对象中缺少属性名或右花括号 }'],
	[/^Expected ':' after property name/i, '属性名后缺少冒号 :'],
	[/^Expected ',' or '}'/i, '缺少逗号 , 或右花括号 }'],
	[/^Expected ',' or ']'/i, '缺少逗号 , 或右方括号 ]'],
	[/^Unexpected non-whitespace character after JSON/i, 'JSON 结束后还有多余内容'],
	[/^Bad escaped character/i, '存在无效的转义字符'],
	[/^Bad Unicode escape/i, '存在无效的 Unicode 转义'],
	[/^Bad control character/i, '字符串中存在非法控制字符'],
	[/^Unexpected token/i, '出现无法解析的字符'],
]

export function indentUnit(indent: TJsonIndent) {
	return indent === 'tab' ? '\t' : Number(indent)
}

function translateError(raw: string) {
	const matched = ERROR_MESSAGES.find(([pattern]) => pattern.test(raw))
	return matched ? matched[1] : 'JSON 语法错误'
}

function positionToLineColumn(text: string, position: number) {
	const safePosition = Math.max(0, Math.min(position, text.length))
	const before = text.slice(0, safePosition).split('\n')
	return {
		line: before.length,
		column: before[before.length - 1].length + 1,
	}
}

function lineColumnToPosition(text: string, line: number, column: number) {
	const lines = text.split('\n')
	let position = 0
	for (let index = 0; index < line - 1 && index < lines.length; index++) {
		position += lines[index].length + 1
	}
	return Math.min(position + Math.max(column - 1, 0), text.length)
}

function locateError(text: string, raw: string): Omit<TJsonError, 'message' | 'detail'> {
	const lineColumn = raw.match(/line (\d+) column (\d+)/i)
	if (lineColumn) {
		const line = Number(lineColumn[1])
		const column = Number(lineColumn[2])
		return {
			line,
			column,
			position: lineColumnToPosition(text, line, column),
		}
	}

	const positionMatch = raw.match(/position (\d+)/i)
	const position = positionMatch ? Number(positionMatch[1]) : text.length
	return { ...positionToLineColumn(text, position), position }
}

export function parseJson(text: string): TJsonParseResult {
	try {
		return { ok: true, value: JSON.parse(text) }
	} catch (error) {
		const detail = error instanceof Error ? error.message : 'JSON 解析失败'
		return {
			ok: false,
			error: {
				message: translateError(detail),
				detail,
				...locateError(text, detail),
			},
		}
	}
}

export function stringifyJson(
	value: unknown,
	indent: TJsonIndent,
	minify = false,
) {
	return JSON.stringify(value, null, minify ? undefined : indentUnit(indent)) ?? ''
}

export function sortJsonKeys(value: unknown, order: 'asc' | 'desc'): unknown {
	if (Array.isArray(value)) {
		return value.map(item => sortJsonKeys(item, order))
	}

	if (value !== null && typeof value === 'object') {
		const entries = Object.entries(value as Record<string, unknown>).sort(
			([left], [right]) =>
				order === 'asc'
					? left < right
						? -1
						: left > right
							? 1
							: 0
					: left > right
						? -1
						: left < right
							? 1
							: 0,
		)
		return Object.fromEntries(
			entries.map(([key, child]) => [key, sortJsonKeys(child, order)]),
		)
	}

	return value
}

export function escapeJsonText(text: string) {
	return JSON.stringify(text)
}

function looseUnescape(text: string) {
	let result = ''
	for (let index = 0; index < text.length; index++) {
		const char = text[index]
		if (char !== '\\' || index === text.length - 1) {
			result += char
			continue
		}

		const next = text[index + 1]
		switch (next) {
			case '"':
			case '\\':
			case '/':
				result += next
				index++
				break
			case 'b':
				result += '\b'
				index++
				break
			case 'f':
				result += '\f'
				index++
				break
			case 'n':
				result += '\n'
				index++
				break
			case 'r':
				result += '\r'
				index++
				break
			case 't':
				result += '\t'
				index++
				break
			case 'u': {
				const hex = text.slice(index + 2, index + 6)
				if (/^[0-9a-f]{4}$/i.test(hex)) {
					result += String.fromCharCode(Number.parseInt(hex, 16))
					index += 5
				} else {
					result += char
				}
				break
			}
			default:
				result += char
		}
	}
	return result
}

export function unescapeJsonText(
	text: string,
	indent: TJsonIndent,
): TJsonUnescapeResult {
	const trimmed = text.trim()
	if (!trimmed) {
		return { ok: false, message: '请先输入要还原的内容' }
	}

	let decoded: string
	try {
		const value = JSON.parse(trimmed)
		if (typeof value !== 'string') {
			return { ok: false, message: '当前内容已经是 JSON，不需要还原' }
		}
		decoded = value
	} catch {
		try {
			decoded = JSON.parse(`"${trimmed}"`) as string
		} catch {
			decoded = looseUnescape(trimmed)
		}
	}

	try {
		return {
			ok: true,
			text: JSON.stringify(JSON.parse(decoded), null, indentUnit(indent)),
		}
	} catch {
		return { ok: true, text: decoded }
	}
}
