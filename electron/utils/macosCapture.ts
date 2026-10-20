import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { Display, screen, systemPreferences } from 'electron'

const execFileAsync = promisify(execFile)
const MACOS_SCREEN_CAPTURE_BIN = '/usr/sbin/screencapture'
const TCC_UTIL_BIN = '/usr/bin/tccutil'
const PLUTIL_BIN = '/usr/bin/plutil'
const SCREEN_CAPTURE_DENIED_TEXT = 'could not create image from display'
/** 与 electron-builder.json5 的 appId 保持一致，仅在读取 Info.plist 失败时兜底 */
const FALLBACK_BUNDLE_ID = 'com.snowTools.app'

/**
 * screencapture 是 platform binary，自身无法持有 TCC 授权，
 * 鉴权对象是启动它的那个进程（开发模式下即启动 pnpm dev 的终端）。
 */
export class ScreenCaptureDeniedError extends Error {}

export function getScreenCaptureDeniedMessage() {
	return process.env.VITE_DEV_SERVER_URL
		? '开发模式下截屏由启动 pnpm dev 的终端鉴权，该终端尚未获得屏幕录制权限。\n\n请在「系统设置 → 隐私与安全性 → 屏幕录制」中勾选启动 dev 的终端，然后重启 pnpm dev。'
		: '请在「系统设置 → 隐私与安全性 → 屏幕录制」中允许 SnowTools，然后重启应用。'
}

export function getScreenCaptureAccessStatus() {
	return systemPreferences.getMediaAccessStatus('screen')
}

/**
 * __CFBundleIdentifier 环境变量是从启动方继承的（从终端打开会拿到终端宿主的 bundle id），
 * 拿它去 tccutil reset 会误删别的应用的授权，所以只认自己 bundle 的 Info.plist。
 */
async function getAppBundleId() {
	try {
		const { stdout } = await execFileAsync(PLUTIL_BIN, [
			'-extract',
			'CFBundleIdentifier',
			'raw',
			'-o',
			'-',
			path.join(process.resourcesPath, '..', 'Info.plist'),
		])
		const bundleId = stdout.trim()
		if (bundleId) {
			return bundleId
		}
	} catch (error) {
		console.error('Failed to read CFBundleIdentifier from Info.plist:', error)
	}

	return FALLBACK_BUNDLE_ID
}

/**
 * 删掉 TCC 里本应用的录屏授权记录。
 * 记录中的 code requirement 绑死了签名证书的 subject.CN，换证书重签后它永远匹配不上，
 * 而系统设置里的开关只翻 auth_value、不会重写 requirement，
 * 于是「已勾选却一直被拒」无法靠界面自愈，只能删掉记录重新授权。
 */
export async function resetScreenCaptureTccRecord() {
	const bundleId = await getAppBundleId()
	await execFileAsync(TCC_UTIL_BIN, ['reset', 'ScreenCapture', bundleId])
}

function getMacCaptureDisplayIndex(targetDisplay: Display) {
	const allDisplays = screen.getAllDisplays()
	const primaryDisplay = screen.getPrimaryDisplay()

	const orderedDisplays = [
		primaryDisplay,
		...allDisplays.filter(display => display.id !== primaryDisplay.id),
	]
	const displayIndex = orderedDisplays.findIndex(
		display => display.id === targetDisplay.id,
	)

	if (displayIndex === -1) {
		throw new Error(
			`Unable to resolve macOS display index for ${targetDisplay.id}`,
		)
	}

	return displayIndex + 1
}

async function runScreencapture(args: string[], tempPath: string) {
	try {
		await execFileAsync(MACOS_SCREEN_CAPTURE_BIN, args)
	} catch (error) {
		const detail =
			error instanceof Error
				? `${error.message}${(error as { stderr?: string }).stderr ?? ''}`
				: String(error)

		if (detail.includes(SCREEN_CAPTURE_DENIED_TEXT)) {
			throw new ScreenCaptureDeniedError(
				'macOS screencapture was denied screen recording access',
			)
		}

		throw error
	}

	const captureBuffer = await fs.readFile(tempPath)
	if (captureBuffer.byteLength === 0) {
		throw new Error('macOS screencapture returned an empty image')
	}

	return new Uint8Array(captureBuffer)
}

export async function captureMacDisplay(targetDisplay: Display) {
	const displayIndex = getMacCaptureDisplayIndex(targetDisplay)
	const tempPath = path.join(
		os.tmpdir(),
		`snow-tool-capture-${Date.now()}-${displayIndex}.png`,
	)

	try {
		return await runScreencapture(
			['-x', '-r', '-D', String(displayIndex), '-t', 'png', tempPath],
			tempPath,
		)
	} finally {
		await fs.unlink(tempPath).catch(() => {})
	}
}
