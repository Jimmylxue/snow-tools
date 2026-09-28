import { exec } from 'child_process'

function shellQuote(value: string) {
	return `'${value.replace(/'/g, `'\\''`)}'`
}

/**
 * 取 Finder 显示名（跟随系统语言），拿不到时回退到 .app 包名。
 * 不 reject：任何应用取不到名字都不应该让整份列表失败。
 */
export function getLocalAppName(appPath: string, fallback: string) {
	return new Promise<string>(resolve => {
		exec(
			`mdls -name kMDItemDisplayName -raw ${shellQuote(appPath)}`,
			(error, stdout) => {
				const displayName = error ? '' : stdout.trim()

				resolve(displayName || fallback)
			},
		)
	})
}
