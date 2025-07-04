import { TTools } from './type'

export const allTools: TTools[] = [
	{
		id: 3,
		name: '翻译',
		icon: '📖',
		recommended: true,
		iconUrl: '/tool-translate.png',
		routerName: 'translate',
	},
	{
		id: 1,
		name: 'gitmoji',
		icon: '😜',
		recommended: true,
		iconUrl: '/tool-gitmoji.png',
		routerName: 'gitmoji',
	},
	{
		id: 2,
		name: '截屏',
		icon: '🔒',
		recommended: true,
		iconUrl: '/tool-capturer.png',
		routerName: 'capturer',
	},
	{
		id: 4,
		name: '剪切板',
		icon: '📋',
		recommended: false,
		iconUrl: '/tool-clipboard.png',
		routerName: 'clipboard',
	},
	{
		id: 1,
		name: '设置',
		icon: '🔧',
		recommended: true,
		iconUrl: '/tool-setting.png',
		routerName: 'setting',
	},
]
