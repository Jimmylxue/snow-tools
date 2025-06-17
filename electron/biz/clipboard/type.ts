export enum ECOPY {
	文本 = 'TEXT',
	图片 = 'IMAGE',
}

export type T_COPY_TYPE = `${ECOPY}`

export type TCopyItem = {
	content: string
	createdTime: number
	type: T_COPY_TYPE
	isCollect: boolean
}
