import { DevToolWindow } from './core'

/**
 * 五个「输入即转换」小工具，每个在启动器里各占一个图标入口。
 * 共用 DevToolWindow 实现，区别只有路由名和渲染层 hash。
 */
export const timestampWindow = new DevToolWindow('TIMESTAMP', '/timestamp')
export const radixWindow = new DevToolWindow('RADIX', '/radix')
export const colorConvertWindow = new DevToolWindow(
	'COLOR_CONVERT',
	'/colorConvert',
)
export const base64ToolWindow = new DevToolWindow('BASE64_TOOL', '/base64Tool')
export const hashToolWindow = new DevToolWindow('HASH_TOOL', '/hashTool')
