enum ESCREEN_SIZE {
	默认输入框 = 'NORMAL',
	输入框输入中 = 'INPUTTING',
	系统设置页 = 'SETTING',
	翻译设置页 = 'FANYI_SETTING',
	剪切板历史页 = 'CLIPBOARD',
	翻译页面 = 'TRANSLATE',
	GITMOJI页面 = 'GITMOJI',
	关于页面 = 'ABOUT',
	图床页面 = 'IMAGE_HOSTING',
	HOSTS页面 = 'HOSTS',
	JSON工具页面 = 'JSON_TOOL',
	时间戳页面 = 'TIMESTAMP',
	进制转换页面 = 'RADIX',
	颜色转换页面 = 'COLOR_CONVERT',
	BASE64页面 = 'BASE64_TOOL',
	哈希页面 = 'HASH_TOOL',
}

export type T_SCREEN_SIZE_TYPE = `${ESCREEN_SIZE}`

export type T_SCREEN_VALUE = {
	width: number
	height: number
	/**
	 * 高度比例 - 相对中间高度
	 */
	topProportion: number
}
