import { TCopyItem } from 'electron/biz/clipboard/type'

export const clipboardFilterArr: {
	text: string
	queryValue: Partial<TCopyItem>
}[] = [
	{
		text: '全部',
		queryValue: {},
	},
	{
		text: '文本',
		queryValue: {
			type: 'TEXT',
		},
	},
	{
		text: '收藏',
		queryValue: {
			isCollect: true,
		},
	},
]
