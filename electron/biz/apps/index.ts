import { exec } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { app, ipcMain, protocol } from 'electron'
import { TApp } from './type'
import { getLocalAppName } from './utils'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function initAppIconProtocol() {
	protocol.registerFileProtocol('app-icon', (request, callback) => {
		try {
			const url = new URL(request.url)
			// 获取请求的相对路径（去掉开头的/）
			const requestPath = decodeURIComponent(url.pathname.substring(1))

			// 动态确定icons目录（开发和生产环境不同）
			const iconsDir =
				process.env.NODE_ENV === 'development'
					? path.join(__dirname, 'icons')
					: path.join(app.getPath('userData'), 'appIcons')

			// 构造完整目标路径
			const targetPath = path.join(iconsDir, requestPath)
			const normalizedPath = path.normalize(targetPath)

			// 安全检查
			if (!normalizedPath.startsWith(path.normalize(iconsDir))) {
				console.error('非法路径访问:', normalizedPath)
				return callback({ error: -3 })
			}

			callback({ path: normalizedPath })
		} catch (error) {
			console.error('协议处理错误:', error)
			callback({ error: -1 })
		}
	})
}

export function initApps() {
	// 注册协议（确保只在ready后调用一次）
	if (!protocol.isProtocolRegistered('app-icon')) {
		initAppIconProtocol()
	}

	ipcMain.handle('getInstalledApps', () => {
		return new Promise((resolve, reject) => {
			exec('ls /Applications', (error, stdout, stderr) => {
				if (error) {
					console.error(`执行错误: ${error.message}`)
					reject(error.message)
					return
				}
				if (stderr) {
					console.error(`错误: ${stderr}`)
					reject(stderr)
					return
				}

				const apps = stdout.split('\n').filter(app => app.endsWith('.app'))
				const iconsData: TApp[] = []

				if (apps.length === 0) {
					resolve(iconsData)
					return
				}

				let processedCount = 0

				// 确保icons目录存在
				// 动态确定icons目录
				const iconsDir =
					process.env.NODE_ENV === 'development'
						? path.join(__dirname, 'icons')
						: path.join(app.getPath('userData'), 'appIcons')

				if (!fs.existsSync(iconsDir)) {
					fs.mkdirSync(iconsDir)
				}

				apps.forEach(async app => {
					const originAppName = app.replace('.app', '')
					let appName = ''
					try {
						appName = await getLocalAppName(app)
					} catch (error) {
						appName = originAppName
						// console.log('333')
					}

					const appPath = `/Applications/${app}`
					const plistPath = `${appPath}/Contents/Info.plist`
					// 获取图标文件名
					exec(
						`/usr/libexec/PlistBuddy -c "Print :CFBundleIconFile" "${plistPath}"`,
						(_, iconStdout) => {
							let iconFile = iconStdout.trim()

							// 如果图标文件名没有扩展名，添加.icns
							if (!iconFile.endsWith('.icns')) {
								iconFile += '.icns'
							}
							const iconPath = `${appPath}/Contents/Resources/${iconFile}`
							const pngPath = path.join(iconsDir, `${originAppName}.png`)

							// 检查图标文件是否存在
							if (!fs.existsSync(iconPath)) {
								processedCount++
								if (processedCount === apps.length) resolve(iconsData)
								return
							}

							// 转换图标
							exec(
								`sips -s format png "${iconPath}" --out "${pngPath}"`,
								convertErr => {
									if (convertErr) {
										console.error(`转换错误: ${convertErr.message}`)
									} else {
										// 计算相对于icons目录的路径
										const relativePath = path.relative(iconsDir, pngPath)
										// 生成安全的URL（兼容Windows路径）
										const safeUrl = `app-icon:///${relativePath
											.split(path.sep)
											.join('/')}`
										// console.log('push~', {
										// 	appName,
										// 	iconUrl: safeUrl, // 使用协议URL
										// 	nativePath: pngPath, // 保留原始路径供其他用途
										// })
										iconsData.push({
											appName,
											originAppName,
											iconUrl: safeUrl, // 使用协议URL
											nativePath: pngPath, // 保留原始路径供其他用途
										})
									}

									processedCount++
									if (processedCount === apps.length) resolve(iconsData)
								}
							)
						}
					)
				})
			})
		})
	})

	ipcMain.on('OPEN_APP', (_, appName: string) => {
		const appPath = `/Applications/${appName}.app`
		// 检查应用是否存在
		if (!fs.existsSync(appPath)) {
			console.error(`应用程序 ${appName} 不存在`)
			return
		}

		// 使用 open 命令打开应用
		exec(`open "${appPath}"`, (error, _, stderr) => {
			if (error) {
				console.error(`打开应用错误: ${error.message}`)
				return
			}
			if (stderr) {
				console.error(`错误: ${stderr}`)
				return
			}
		})
	})
}
