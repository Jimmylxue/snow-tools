type TJsonObject = Record<string, unknown>

const UNCOUNTABLE_WORDS = new Set([
	'data',
	'info',
	'news',
	'series',
	'species',
	'status',
])

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function isObject(value: unknown): value is TJsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidIdentifier(key: string) {
	return IDENTIFIER.test(key)
}

function toPascalCase(input: string) {
	const cleaned = input.replace(/[^A-Za-z0-9_$]+/g, ' ').trim()
	if (!cleaned) return ''
	if (IDENTIFIER.test(cleaned)) {
		return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
	}
	return cleaned
		.split(/\s+/)
		.map(part => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')
}

function singularize(word: string) {
	if (UNCOUNTABLE_WORDS.has(word.toLowerCase())) return word
	if (/ies$/i.test(word)) return `${word.slice(0, -3)}y`
	if (/(ses|xes|zes|ches|shes)$/i.test(word)) return word.slice(0, -2)
	if (/s$/i.test(word) && !/ss$/i.test(word)) return word.slice(0, -1)
	return word
}

/**
 * 结构签名只关心类型，用于复用形状相同的 interface
 */
function signatureOf(value: unknown): string {
	if (value === null) return 'null'
	if (Array.isArray(value)) {
		return `[${value.map(signatureOf).sort().join('|')}]`
	}
	if (isObject(value)) {
		return `{${Object.keys(value)
			.sort()
			.map(key => `${JSON.stringify(key)}:${signatureOf(value[key])}`)
			.join(',')}}`
	}
	return typeof value
}

export function jsonToTypeScript(value: unknown): string {
	const declarations: string[] = []
	const usedNames = new Set<string>()
	const shapeNames = new Map<string, string>()

	const allocateName = (hint: string) => {
		const base = toPascalCase(hint) || 'Item'
		let name = base
		let index = 2
		while (usedNames.has(name.toLowerCase())) {
			name = `${base}${index}`
			index += 1
		}
		usedNames.add(name.toLowerCase())
		return name
	}

	const buildType = (child: unknown, hint: string): string => {
		if (child === null) return 'null'
		if (Array.isArray(child)) {
			if (!child.length) return 'unknown[]'
			const elementTypes = [
				...new Set(child.map(item => buildType(item, singularize(hint)))),
			]
			return elementTypes.length === 1
				? `${elementTypes[0]}[]`
				: `(${elementTypes.join(' | ')})[]`
		}
		if (isObject(child)) return buildObject(child, hint)
		if (typeof child === 'boolean') return 'boolean'
		if (typeof child === 'number') return 'number'
		if (typeof child === 'string') return 'string'
		return 'unknown'
	}

	const buildObject = (
		child: TJsonObject,
		hint: string,
		insertAt?: number,
	): string => {
		const keys = Object.keys(child)
		if (!keys.length) return 'Record<string, never>'

		const signature = signatureOf(child)
		const cached = shapeNames.get(signature)
		if (cached) return cached

		const name = allocateName(hint)
		shapeNames.set(signature, name)

		const fields = keys.map(key => {
			const property = isValidIdentifier(key) ? key : JSON.stringify(key)
			return `  ${property}: ${buildType(child[key], key)}`
		})

		const declaration = `export interface ${name} {\n${fields.join('\n')}\n}`
		if (insertAt === undefined) {
			declarations.push(declaration)
		} else {
			declarations.splice(insertAt, 0, declaration)
		}
		return name
	}

	if (isObject(value) && Object.keys(value).length) {
		buildObject(value, 'Root', 0)
	} else if (Array.isArray(value)) {
		declarations.push(`export type Root = ${buildType(value, 'Item')}`)
	} else {
		declarations.push(`export type Root = ${buildType(value, 'Root')}`)
	}

	return declarations.join('\n\n')
}
