export type TCalculationResult = {
	expression: string
	value: string
}

type TOperator = '+' | '-' | '*' | '/' | '^' | '%'

type TToken =
	| { type: 'number'; value: number }
	| { type: 'operator'; value: TOperator }
	| { type: 'identifier'; value: string }
	| { type: 'paren'; value: '(' | ')' }
	| { type: 'comma' }

type TFunctionDefinition = {
	arity: 'unary' | 'variadic'
	apply: (...args: number[]) => number
}

const FUNCTIONS: Record<string, TFunctionDefinition> = {
	sqrt: { arity: 'unary', apply: Math.sqrt },
	abs: { arity: 'unary', apply: Math.abs },
	round: { arity: 'unary', apply: Math.round },
	floor: { arity: 'unary', apply: Math.floor },
	ceil: { arity: 'unary', apply: Math.ceil },
	sin: { arity: 'unary', apply: Math.sin },
	cos: { arity: 'unary', apply: Math.cos },
	tan: { arity: 'unary', apply: Math.tan },
	log: { arity: 'unary', apply: Math.log10 },
	ln: { arity: 'unary', apply: Math.log },
	exp: { arity: 'unary', apply: Math.exp },
	min: { arity: 'variadic', apply: Math.min },
	max: { arity: 'variadic', apply: Math.max },
}

const CONSTANTS: Record<string, number> = {
	pi: Math.PI,
	e: Math.E,
}

const NUMBER_PATTERN =
	/^(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?/
const NUMBER_ONLY_PATTERN =
	/^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/
const DATE_PATTERN = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/
const TIME_PATTERN = /^\d{1,2}:\d{2}(?::\d{2})?$/

function normalizeExpression(input: string) {
	return input
		.trim()
		.replace(/=\s*$/, '')
		.replace(/[×✕]/g, '*')
		.replace(/÷/g, '/')
		.replace(/[−–—]/g, '-')
		.replace(/（/g, '(')
		.replace(/）/g, ')')
		.replace(/＋/g, '+')
		.replace(/－/g, '-')
		.replace(/＊/g, '*')
		.replace(/／/g, '/')
		.replace(/％/g, '%')
		.replace(/π/g, 'pi')
}

function tokenize(expression: string) {
	const tokens: TToken[] = []
	let index = 0

	while (index < expression.length) {
		const char = expression[index]

		if (/\s/.test(char)) {
			index += 1
			continue
		}

		if (char === '(' || char === ')') {
			tokens.push({ type: 'paren', value: char })
			index += 1
			continue
		}

		if (char === ',') {
			tokens.push({ type: 'comma' })
			index += 1
			continue
		}

		if ('+-*/^%'.includes(char)) {
			if (char === '*' && expression[index + 1] === '*') {
				tokens.push({ type: 'operator', value: '^' })
				index += 2
				continue
			}
			tokens.push({ type: 'operator', value: char as TOperator })
			index += 1
			continue
		}

		if (/\d/.test(char) || (char === '.' && /\d/.test(expression[index + 1] ?? ''))) {
			const match = expression.slice(index).match(NUMBER_PATTERN)
			if (!match) {
				throw new Error('invalid number')
			}
			tokens.push({
				type: 'number',
				value: Number(match[0].replace(/,/g, '')),
			})
			index += match[0].length
			continue
		}

		if (/[A-Za-z]/.test(char)) {
			const match = expression.slice(index).match(/^[A-Za-z]+/)
			if (!match) {
				throw new Error('invalid identifier')
			}
			tokens.push({ type: 'identifier', value: match[0].toLowerCase() })
			index += match[0].length
			continue
		}

		throw new Error('unexpected character')
	}

	return tokens
}

class Parser {
	private index = 0
	private readonly tokens: TToken[]

	constructor(tokens: TToken[]) {
		this.tokens = tokens
	}

	parse() {
		const value = this.parseExpression()

		if (this.index < this.tokens.length) {
			throw new Error('unexpected token')
		}

		return value
	}

	private peek() {
		return this.tokens[this.index]
	}

	private matchOperator(...operators: TOperator[]) {
		const token = this.peek()

		if (token?.type === 'operator' && operators.includes(token.value)) {
			this.index += 1
			return token.value
		}

		return null
	}

	private parseExpression(): number {
		let value = this.parseTerm()

		for (;;) {
			const operator = this.matchOperator('+', '-')
			if (!operator) break

			const right = this.parseTerm()
			value = operator === '+' ? value + right : value - right
		}

		return value
	}

	private parseTerm(): number {
		let value = this.parseUnary()

		for (;;) {
			const operator = this.matchOperator('*', '/')
			if (!operator) break

			const right = this.parseUnary()
			value = operator === '*' ? value * right : value / right
		}

		return value
	}

	private parseUnary(): number {
		if (this.matchOperator('+')) return this.parseUnary()
		if (this.matchOperator('-')) return -this.parseUnary()

		return this.parsePower()
	}

	private parsePower(): number {
		const base = this.parsePostfix()

		if (this.matchOperator('^')) {
			/** 右结合，同时允许 2^-3 这种写法 */
			return Math.pow(base, this.parseUnary())
		}

		return base
	}

	private parsePostfix(): number {
		let value = this.parsePrimary()

		while (this.matchOperator('%')) {
			value /= 100
		}

		return value
	}

	private parsePrimary(): number {
		const token = this.peek()
		if (!token) throw new Error('unexpected end')

		if (token.type === 'number') {
			this.index += 1
			return token.value
		}

		if (token.type === 'paren' && token.value === '(') {
			this.index += 1
			const value = this.parseExpression()
			const closing = this.peek()

			if (closing?.type !== 'paren' || closing.value !== ')') {
				throw new Error('missing closing parenthesis')
			}

			this.index += 1
			return value
		}

		if (token.type === 'identifier') {
			this.index += 1
			const fn = FUNCTIONS[token.value]
			const constant = CONSTANTS[token.value]

			if (constant !== undefined) return constant
			if (!fn) throw new Error('unknown identifier')

			const open = this.peek()
			if (open?.type !== 'paren' || open.value !== '(') {
				throw new Error('missing function parenthesis')
			}
			this.index += 1

			const args: number[] = []
			const afterOpen = this.peek()
			if (!(afterOpen?.type === 'paren' && afterOpen.value === ')')) {
				for (;;) {
					args.push(this.parseExpression())
					if (this.peek()?.type !== 'comma') break
					this.index += 1
				}
			}

			const close = this.peek()
			if (close?.type !== 'paren' || close.value !== ')') {
				throw new Error('missing closing parenthesis')
			}
			this.index += 1

			if (fn.arity === 'unary' && args.length !== 1) {
				throw new Error('invalid argument count')
			}
			if (fn.arity === 'variadic' && args.length === 0) {
				throw new Error('invalid argument count')
			}

			return fn.apply(...args)
		}

		throw new Error('unexpected token')
	}
}

function formatNumber(value: number) {
	if (Number.isInteger(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER) {
		return String(value)
	}

	return String(Number.parseFloat(value.toPrecision(12)))
}

export function calculateExpression(
	rawInput: string,
): TCalculationResult | null {
	const expression = normalizeExpression(rawInput)

	if (!expression || !/\d/.test(expression)) return null
	if (DATE_PATTERN.test(expression) || TIME_PATTERN.test(expression)) return null
	if (NUMBER_ONLY_PATTERN.test(expression)) return null
	if (
		!/[+\-*/^%()]/.test(expression) &&
		!/[A-Za-z]+\s*\(/.test(expression)
	) {
		return null
	}

	try {
		const tokens = tokenize(expression)
		if (!tokens.length) return null

		const value = new Parser(tokens).parse()
		if (!Number.isFinite(value)) return null

		return {
			expression: rawInput.trim(),
			value: formatNumber(value),
		}
	} catch {
		return null
	}
}
