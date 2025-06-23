import { TShortCutKeyMap } from './type'

export const shortCutKeyMap: TShortCutKeyMap = {
	OPEN: {
		event: 'HOT_KEY_EVENT',
		editing: 'EDITING_OPEN_HOT_KEY',
		completed: 'EDITING_OPEN_HOT_KEY_COMPLETE',
		localstorageKey: 'snow-tools-open_hotkey',
		winDefaultKey: import.meta.env.VITE_APP_WINDOWS_OPEN_HOT_KEY,
		macDefaultKey: import.meta.env.VITE_APP_MAC_OPEN_HOT_KEY,
	},
	CAPTURER: {
		event: 'CAPTURE_KEY_EVENT',
		editing: 'EDITING_CAPTURER_HOT_KEY',
		completed: 'EDITING_CAPTURER_HOT_KET_COMPLETE',
		localstorageKey: 'snow-tools-capturer_hotkey',
		winDefaultKey: import.meta.env.VITE_APP_WINDOWS_CAPTURER_HOT_KEY,
		macDefaultKey: import.meta.env.VITE_APP_MAC_CAPTURER_HOT_KEY,
	},
}
