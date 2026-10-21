export enum ECOPY {
	文本 = 'TEXT',
	图片 = 'IMAGE',
}

export type T_COPY_TYPE = `${ECOPY}`

/** 图片的附加信息；图片本体放在磁盘上，这里只存元数据 */
export type TCopyImageMeta = {
	/** 文件名（不含目录），实际路径由主进程拼接 */
	fileName: string
	width: number
	height: number
	/** 原图字节数 */
	size: number
}

export type TCopyItem = {
	/** 文本类型存正文；图片类型存可读摘要（如「图片 1920×1080」） */
	content: string
	createdTime: number
	type: T_COPY_TYPE
	isCollect: boolean
	/** 仅图片类型有 */
	image?: TCopyImageMeta
}

/** 图片存储占用统计，用于在界面上把「占了多少空间」讲清楚 */
export type TClipboardImageStats = {
	count: number
	totalBytes: number
	/** 体积上限，超出后自动清理最旧的未收藏项 */
	maxBytes: number
	/** 张数上限 */
	maxItems: number
}
