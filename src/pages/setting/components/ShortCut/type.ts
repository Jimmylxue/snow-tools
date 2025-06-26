import { T_HOT_KEY_TYPE } from 'electron/constant/hotkey/type'

export type TShortCutUUKey = 'OPEN' | 'CAPTURER'

export type TShortCutKeyMap = {
	[key in TShortCutUUKey]: {
		event: string
		editing: T_HOT_KEY_TYPE
		completed: T_HOT_KEY_TYPE
		winDefaultKey: string
		macDefaultKey: string
		localstorageKey: string
	}
}
