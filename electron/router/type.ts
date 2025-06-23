import { BrowserWindow } from 'electron'

export interface TWindows {
	instance: BrowserWindow | null
	create: () => BrowserWindow
	destroy: () => void

	show: () => void
	close: () => void
}
