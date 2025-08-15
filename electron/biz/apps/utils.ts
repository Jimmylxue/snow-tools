import { exec } from 'child_process'

export function getLocalAppName(originAppName: string): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(
			`mdls -name kMDItemDisplayName /Applications/${originAppName}`,
			(error, stdout, stderr) => {
				if (error) {
					reject(error.message)
					return
				}
				if (stderr) {
					reject(stderr)
					return
				}
				const regex = /kMDItemDisplayName\s*=\s*"([^"]*)"/
				const match = stdout.match(regex)
				const appName = match?.[1] || '未知应用'
				resolve(appName)
			}
		)
	})
}
