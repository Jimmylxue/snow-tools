import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { Display, screen } from 'electron'

const execFileAsync = promisify(execFile)
const MACOS_SCREEN_CAPTURE_BIN = '/usr/sbin/screencapture'
const SCREEN_CAPTURE_DENIED_TEXT = 'could not create image from display'

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
