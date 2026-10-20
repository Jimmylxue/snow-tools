/**
 * 截屏遮罩是全屏模态：从触发截屏开始到遮罩关闭为止，主进程要拒绝其它窗口的唤醒。
 * 单独成模块，避免 shortcut / tray / main 与 capturer 之间形成循环依赖。
 */
let active = false

export function beginCaptureSession() {
	active = true
}

export function endCaptureSession() {
	active = false
}

export function isCaptureSessionActive() {
	return active
}
