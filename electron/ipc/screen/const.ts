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
	width: 820,
	height: 600,
	topProportion: 1.3,
}

export const CLIPBOARD_HISTORY_PAGE_SIZE: T_SCREEN_VALUE = {
	width: 600,
	height: 600,
	topProportion: 1.3,
}

export const IMAGE_HOSTING_SETTING_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 860,
	height: 560,
	topProportion: 1.3,
}

export const HOSTS_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 780,
	height: 560,
	topProportion: 1.3,
}

export const JSON_TOOL_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 960,
	height: 640,
	topProportion: 1.3,
}

/** 五个独立小工具共用同一套尺寸：左边输入、右边结果，比 JSON 工具小一号 */
export const DEV_TOOLS_SCREEN_SIZE: T_SCREEN_VALUE = {
	width: 760,
	height: 460,
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
		IMAGE_HOSTING: IMAGE_HOSTING_SETTING_SCREEN_SIZE,
		HOSTS: HOSTS_SCREEN_SIZE,
		JSON_TOOL: JSON_TOOL_SCREEN_SIZE,
		TIMESTAMP: DEV_TOOLS_SCREEN_SIZE,
		RADIX: DEV_TOOLS_SCREEN_SIZE,
		COLOR_CONVERT: DEV_TOOLS_SCREEN_SIZE,
		BASE64_TOOL: DEV_TOOLS_SCREEN_SIZE,
		HASH_TOOL: DEV_TOOLS_SCREEN_SIZE,
	}
