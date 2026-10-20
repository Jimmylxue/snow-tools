export type TAutoLaunchState = {
	available: boolean
	enabled: boolean
	isPackaged: boolean
	/** macOS 13+ 登录项状态：enabled / requires-approval / not-registered / not-found */
	status: string | null
	reason?: string
}

export type TAutoLaunchSetResult =
	| { ok: true; state: TAutoLaunchState }
	| { ok: false; message: string }
