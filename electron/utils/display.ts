import { screen } from 'electron'

export function getCurrentDisplay() {
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

	return display
}
