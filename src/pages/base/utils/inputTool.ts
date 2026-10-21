import { calculateExpression } from './calculator'
import { detectQuickResult, TQuickResult } from './quickTools'

/**
 * 启动器「输入即工具」的统一入口。
 *
 * 三层优先级：
 * 1. 快捷工具（时间戳 / 进制 / 颜色 / Base64 / 哈希）——命令式输入必须最优先，
 *    否则 `base64 1234` 会被进制探测器抢走；
 * 2. 算式——保持原有行为不变；
 * 3. 都没有则返回 null，交回给工具与应用搜索。
 */
export function resolveInputTool(rawInput: string): TQuickResult | null {
	const quick = detectQuickResult(rawInput)
	if (quick) return quick

	const calculation = calculateExpression(rawInput)
	if (!calculation) return null

	return {
		kind: '计算',
		expression: calculation.expression,
		value: calculation.value,
		rows: [],
	}
}
