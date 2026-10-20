type TFoldRange = {
	closeLine: number
}

type TTokenKind =
	| 'key'
	| 'string'
	| 'number'
	| 'literal'
	| 'punctuation'
	| 'plain'

type TToken = {
	text: string
	kind: TTokenKind
}

export const TOKEN_CLASS: Record<TTokenKind, string> = {
	key: 'text-sky-700',
	string: 'text-emerald-600',
	number: 'text-amber-600',
	literal: 'text-violet-600',
	punctuation: 'text-slate-400',
	plain: 'text-slate-700',
}

export function analyzeFolds(lines: string[]) {
	const stack: number[] = []
	const folds = new Map<number, TFoldRange>()

	lines.forEach((line, lineIndex) => {
		let inString = false
		let escaped = false

		for (const char of line) {
			if (inString) {
				if (escaped) {
					escaped = false
				} else if (char === '\\') {
					escaped = true
				} else if (char === '"') {
					inString = false
				}
				continue
			}

			if (char === '"') {
				inString = true
			} else if (char === '{' || char === '[') {
				stack.push(lineIndex)
			} else if (char === '}' || char === ']') {
				const openLine = stack.pop()
				if (openLine !== undefined && openLine !== lineIndex) {
					folds.set(openLine, { closeLine: lineIndex })
				}
			}
		}
	})

	return folds
}

export function countJsonFolds(value: string) {
	return analyzeFolds(value.split('\n')).size
}

export function tokenizeLine(line: string): TToken[] {
	const tokens: TToken[] = []
	let index = 0

	while (index < line.length) {
		const char = line[index]

		if (char === '"') {
			let end = index + 1
			let escaped = false
			while (end < line.length) {
				const current = line[end]
				if (escaped) {
					escaped = false
				} else if (current === '\\') {
					escaped = true
				} else if (current === '"') {
					end += 1
					break
				}
				end += 1
			}

			let lookahead = end
			while (lookahead < line.length && /\s/.test(line[lookahead])) {
				lookahead += 1
			}

			tokens.push({
				text: line.slice(index, end),
				kind: line[lookahead] === ':' ? 'key' : 'string',
			})
			index = end
			continue
		}

		if (char === 't' && line.startsWith('true', index)) {
			tokens.push({ text: 'true', kind: 'literal' })
			index += 4
			continue
		}
		if (char === 'f' && line.startsWith('false', index)) {
			tokens.push({ text: 'false', kind: 'literal' })
			index += 5
			continue
		}
		if (char === 'n' && line.startsWith('null', index)) {
			tokens.push({ text: 'null', kind: 'literal' })
			index += 4
			continue
		}

		if (char === '-' || (char >= '0' && char <= '9')) {
			const match = line
				.slice(index)
				.match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/)
			if (match) {
				tokens.push({ text: match[0], kind: 'number' })
				index += match[0].length
				continue
			}
		}

		if ('{}[],:'.includes(char)) {
			tokens.push({ text: char, kind: 'punctuation' })
			index += 1
			continue
		}

		let end = index + 1
		while (end < line.length) {
			const current = line[end]
			if (
				current === '"' ||
				'{}[],:'.includes(current) ||
				current === '-' ||
				(current >= '0' && current <= '9') ||
				(current === 't' && line.startsWith('true', end)) ||
				(current === 'f' && line.startsWith('false', end)) ||
				(current === 'n' && line.startsWith('null', end))
			) {
				break
			}
			end += 1
		}
		tokens.push({ text: line.slice(index, end), kind: 'plain' })
		index = end
	}

	return tokens
}

export function collapsedLine(openText: string, closeText: string) {
	return `${openText.replace(/\s+$/, '')} … ${closeText.trim()}`
}
