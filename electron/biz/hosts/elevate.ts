import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export class HostsElevationCancelledError extends Error {
	constructor() {
		super('已取消管理员授权')
		this.name = 'HostsElevationCancelledError'
	}
}

export function getSystemHostsPath() {
	if (process.platform === 'win32') {
		return path.join(
			process.env.SystemRoot || 'C:\\Windows',
			'System32',
			'drivers',
			'etc',
			'hosts',
		)
	}

	return '/etc/hosts'
}

const MAC_FLUSH_COMMAND =
	'/usr/sbin/dscacheutil -flushcache; /usr/bin/killall -HUP mDNSResponder'

const LINUX_FLUSH_COMMAND = [
	'if command -v resolvectl >/dev/null 2>&1; then resolvectl flush-caches;',
	'elif command -v systemd-resolve >/dev/null 2>&1; then systemd-resolve --flush-caches;',
	'elif command -v nscd >/dev/null 2>&1; then nscd -i hosts;',
	'fi',
].join(' ')

function errorText(error: unknown) {
	if (typeof error === 'object' && error) {
		const { stderr, stdout, message } = error as {
			stderr?: string
			stdout?: string
			message?: string
		}
		return [stderr, stdout, message].filter(Boolean).join('\n')
	}

	return String(error)
}

function isCancelled(error: unknown) {
	return /User canceled|User cancelled|canceled by the user|cancelled by the user|cancelled by user|Request dismissed|Not authorized|操作已被用户取消|请求被取消|\(-128\)/i.test(
		errorText(error),
	)
}

function escapeAppleScript(value: string) {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function escapePowerShellLiteral(value: string) {
	return value.replace(/'/g, "''")
}

async function runMacElevated(command: string) {
	const script = `do shell script "${escapeAppleScript(command)}" with administrator privileges`

	try {
		await execFileAsync('/usr/bin/osascript', ['-e', script], {
			timeout: 180000,
		})
	} catch (error) {
		if (isCancelled(error)) {
			throw new HostsElevationCancelledError()
		}
		throw new Error(
			`管理员授权执行失败：${errorText(error).trim() || '未知错误'}`,
		)
	}
}

async function writeWithMac(content: string, flush: boolean) {
	const tmp = path.join(
		os.tmpdir(),
		`snow-tools-hosts-${process.pid}-${Date.now()}`,
	)
	await fs.writeFile(tmp, content, { mode: 0o600 })

	try {
		const install = [
			`/bin/cp -f "${tmp}" /private/etc/.hosts.snow-tools`,
			'/usr/sbin/chown root:wheel /private/etc/.hosts.snow-tools',
			'/bin/chmod 644 /private/etc/.hosts.snow-tools',
			'/bin/mv -f /private/etc/.hosts.snow-tools /private/etc/hosts',
		].join(' && ')

		/** 刷新缓存失败不能反过来判定写入失败，但写入失败必须让命令返回非 0 */
		const command = flush
			? `(${install}) && (${MAC_FLUSH_COMMAND} >/dev/null 2>&1 || true)`
			: install

		await runMacElevated(command)
	} finally {
		await fs.unlink(tmp).catch(() => undefined)
	}
}

async function writeWithWindows(content: string, flush: boolean) {
	const tmp = path.join(
		os.tmpdir(),
		`snow-tools-hosts-${process.pid}-${Date.now()}`,
	)
	await fs.writeFile(tmp, content, 'utf8')

	try {
		const commands = [
			"$ErrorActionPreference = 'Stop'",
			`Copy-Item -LiteralPath '${escapePowerShellLiteral(tmp)}' -Destination '${escapePowerShellLiteral(getSystemHostsPath())}' -Force`,
			flush ? 'ipconfig /flushdns | Out-Null' : '',
		].filter(Boolean)

		const encoded = Buffer.from(commands.join('\r\n'), 'utf16le').toString(
			'base64',
		)
		const outer = [
			"Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -WindowStyle Hidden",
			`-ArgumentList '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand','${encoded}'`,
		].join(' ')

		try {
			await execFileAsync(
				'powershell.exe',
				['-NoProfile', '-NonInteractive', '-Command', outer],
				{ timeout: 180000 },
			)
		} catch (error) {
			if (isCancelled(error)) {
				throw new HostsElevationCancelledError()
			}
			throw new Error(
				`管理员授权执行失败：${errorText(error).trim() || '未知错误'}`,
			)
		}
	} finally {
		await fs.unlink(tmp).catch(() => undefined)
	}
}

async function writeWithLinux(content: string, flush: boolean) {
	const tmp = path.join(
		os.tmpdir(),
		`snow-tools-hosts-${process.pid}-${Date.now()}`,
	)
	await fs.writeFile(tmp, content, { mode: 0o600 })

	try {
		const install = [
			`/bin/cp -f "${tmp}" /etc/.hosts.snow-tools`,
			'/bin/chmod 644 /etc/.hosts.snow-tools',
			'/bin/mv -f /etc/.hosts.snow-tools /etc/hosts',
		].join(' && ')
		const command = flush
			? `(${install}) && ((${LINUX_FLUSH_COMMAND}) >/dev/null 2>&1 || true)`
			: install

		try {
			await execFileAsync('/usr/bin/pkexec', ['/bin/sh', '-c', command], {
				timeout: 180000,
			})
		} catch (error) {
			if (isCancelled(error)) {
				throw new HostsElevationCancelledError()
			}
			throw new Error(
				`管理员授权执行失败（需要 pkexec）：${errorText(error).trim() || '未知错误'}`,
			)
		}
	} finally {
		await fs.unlink(tmp).catch(() => undefined)
	}
}

export async function writeSystemHosts(content: string, flush: boolean) {
	if (process.platform === 'darwin') {
		await writeWithMac(content, flush)
		return
	}
	if (process.platform === 'win32') {
		await writeWithWindows(content, flush)
		return
	}
	await writeWithLinux(content, flush)
}

export async function flushSystemDns() {
	if (process.platform === 'darwin') {
		await runMacElevated(MAC_FLUSH_COMMAND)
		return
	}

	if (process.platform === 'win32') {
		try {
			await execFileAsync('ipconfig', ['/flushdns'])
			return
		} catch {
			/** 某些环境 /flushdns 也需要管理员权限，兜底再提权一次 */
			const encoded = Buffer.from('ipconfig /flushdns', 'utf16le').toString(
				'base64',
			)
			const outer = `Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -WindowStyle Hidden -ArgumentList '-NoProfile','-NonInteractive','-EncodedCommand','${encoded}'`

			try {
				await execFileAsync(
					'powershell.exe',
					['-NoProfile', '-NonInteractive', '-Command', outer],
					{ timeout: 180000 },
				)
				return
			} catch (error) {
				if (isCancelled(error)) {
					throw new HostsElevationCancelledError()
				}
				throw new Error(
					`刷新 DNS 缓存失败：${errorText(error).trim() || '未知错误'}`,
				)
			}
		}
	}

	try {
		await execFileAsync(
			'/usr/bin/pkexec',
			['/bin/sh', '-c', LINUX_FLUSH_COMMAND],
			{ timeout: 180000 },
		)
	} catch (error) {
		if (isCancelled(error)) {
			throw new HostsElevationCancelledError()
		}
		throw new Error(
			`刷新 DNS 缓存失败：${errorText(error).trim() || '未知错误'}`,
		)
	}
}
