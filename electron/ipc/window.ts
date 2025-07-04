import { screen } from 'electron'

import { currentScreen } from './screen'

export function getOpenWindowBound() {
	const { width } = currentScreen.value
	const currentDisplay = screen.getCursorScreenPoint()
	const displays = screen.getAllDisplays()

	const display = displays.find(display => {
		return (
			currentDisplay.x >= display.bounds.x &&
			currentDisplay.x <= display.bounds.x + display.bounds.width &&
			currentDisplay.y >= display.bounds.y &&
			currentDisplay.y <= display.bounds.y + display.bounds.height
		)
	})

	return {
		x: display!.bounds.x + display!.bounds.width / 2 - width / 2, // 窗口居中
		y: display!.bounds.y + display!.bounds.height / 4.5,
	}
}
