import { T_SCREEN_SIZE_TYPE, T_SCREEN_VALUE } from './type'

export const NORMAL_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 700,
	height: 400,
	topProportion: 1.3,
}

export const ABOUT_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 500,
	height: 400,
	topProportion: 1.3,
}

export const TRANSLATE_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 600,
	height: 300,
	topProportion: 1.3,
}

export const GITMOJI_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 600,
	height: 361,
	topProportion: 1.3,
}

const COMMAND_INPUTTING_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 600,
	height: 300,
	topProportion: 1.3,
}

const FANYI_SETTING_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 600,
	height: 300,
	topProportion: 1.3,
}

export const SYSTEM_SETTING_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 600,
	height: 400,
	topProportion: 1.3,
}

export const CLIPBOARD_HISTORY_PAGE_SIZE: T_SCREEN_VALUE = {
	width: 600,
	height: 600,
	topProportion: 1.3,
}

export const SCREEN_SIZE_MAP: { [key in T_SCREEN_SIZE_TYPE]: T_SCREEN_VALUE } =
	{
		NORMAL: NORMAL_SCREEN_SIZE,
		INPUTTING: COMMAND_INPUTTING_SCREEN_SIZE,
		TRANSLATE: TRANSLATE_SCREEN_SIZE,
		FANYI_SETTING: FANYI_SETTING_SCREEN_SIZE,
		SETTING: SYSTEM_SETTING_SCREEN_SIZE,
		CLIPBOARD: CLIPBOARD_HISTORY_PAGE_SIZE,
		GITMOJI: GITMOJI_SCREEN_SIZE,
		ABOUT: ABOUT_SCREEN_SIZE,
	}
