import { BrowserWindow } from 'electron'
import { T_SCREEN_SIZE_TYPE } from 'electron/ipc/screen'

export interface TWindows {
	instance: BrowserWindow | null

	routerName: T_SCREEN_SIZE_TYPE

	create: () => BrowserWindow
	destroy: () => void

	show: () => void
	close: () => void

	shortcutCallback: () => void
}
