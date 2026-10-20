import { TTools } from './type'
import TranslatePng from '@/assets/img/tool-translate.png'
import GitmojiPng from '@/assets/img/tool-gitmoji.png'
import CapturePng from '@/assets/img/tool-capturer.png'
import ClipboardPng from '@/assets/img/tool-clipboard.png'
import SettingPng from '@/assets/img/tool-setting.png'
import ImageHostingPng from '@/assets/img/tool-imageHosting.png'
import HostsSvg from '@/assets/img/tool-hosts.svg'

export const allTools: TTools[] = [
	{
		id: 3,
		name: '翻译',
		icon: '📖',
		recommended: true,
		iconUrl: TranslatePng,
		routerName: 'translate',
	},
	{
		id: 1,
		name: 'gitmoji',
		icon: '😜',
		recommended: true,
		iconUrl: GitmojiPng,
		routerName: 'gitmoji',
	},
	{
		id: 2,
		name: '截屏',
		icon: '🔒',
		recommended: true,
		iconUrl: CapturePng,
		routerName: 'capturer',
	},
	{
		id: 4,
		name: '剪切板',
		icon: '📋',
		recommended: false,
		iconUrl: ClipboardPng,
		routerName: 'clipboard',
	},
	{
		id: 4,
		name: '图床',
		icon: '🎨',
		recommended: false,
		iconUrl: ImageHostingPng,
		routerName: 'imageHosting',
	},
	{
		id: 7,
		name: 'Hosts',
		icon: '🌐',
		recommended: true,
		iconUrl: HostsSvg,
		routerName: 'hosts',
	},
	{
		id: 1,
		name: '设置',
		icon: '🔧',
		recommended: true,
		iconUrl: SettingPng,
		routerName: 'setting',
	},
]
