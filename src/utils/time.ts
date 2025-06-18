import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'

// 加载 dayjs 插件
dayjs.extend(relativeTime)
dayjs.extend(duration)

/**
 * 格式化时间距离（当前时间 - 给定时间戳）
 * @param {number | string | Date} timestamp - 时间戳（毫秒）、Date 对象或可解析的日期字符串
 * @returns {string} - 格式化后的时间差（如 "1分钟前"、"2小时前"、"3天前"）
 */
export function formatDistanceTime(timestamp: number) {
	const now = dayjs()
	const target = dayjs(timestamp)
	const diffInMilliseconds = now.diff(target)
	const diffInMinutes = Math.floor(
		dayjs.duration(diffInMilliseconds).asMinutes()
	)
	const diffInHours = Math.floor(dayjs.duration(diffInMilliseconds).asHours())
	const diffInDays = Math.floor(dayjs.duration(diffInMilliseconds).asDays())

	if (diffInMinutes < 1) {
		return '1分钟前' // 不足1分钟按1分钟算
	} else if (diffInHours < 1) {
		return `${diffInMinutes}分钟前`
	} else if (diffInDays < 1) {
		return `${diffInHours}小时前` // 下取整（如 1.6小时 → 1小时）
	} else {
		return `${diffInDays}天前` // 下取整（如 2.9天 → 2天）
	}
}
