import { screen } from 'electron'
import { SCREEN_SIZE_MAP, T_SCREEN_SIZE_TYPE } from '../ipc/screen'

/**
 * 光标可能在已断开的外接屏残留坐标上，这里取最近的屏幕而不是精确匹配
 */
export function getCurrentDisplay() {
	return screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
}

export function getCenterPositionBoundByRouter(router: T_SCREEN_SIZE_TYPE) {
	const { width } = SCREEN_SIZE_MAP[router]
	const { bounds } = getCurrentDisplay()

	return {
		x: bounds.x + bounds.width / 2 - width / 2, // 窗口居中
		y: bounds.y + bounds.height / 4.5,
	}
}
