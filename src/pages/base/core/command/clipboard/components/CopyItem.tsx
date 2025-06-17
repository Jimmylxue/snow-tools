import { TCopyItem } from 'electron/biz/clipboard/type'
import { useState } from 'react'
import { Sparkle } from 'lucide-react'

type TProps = {
	content: TCopyItem
	index: number
	isSelected: boolean
	onClick: () => void
	onDoubleClick: () => void
	/**
	 * 收藏
	 */
	onSave: () => void
}

export function CopyItem({
	content,
	isSelected,
	onClick,
	onDoubleClick,
	index,
	onSave,
}: TProps) {
	const [expanded, setExpanded] = useState(false)
	const [isClamped, setIsClamped] = useState(false)

	return (
		<div
			className={`border rounded-lg p-3 transition-all duration-300 mb-2 ${
				isSelected
					? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-md'
					: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md'
			}`}
			onClick={onClick}
			onDoubleClick={onDoubleClick}
			id={`contentItem-${index}`}
		>
			<div
				className={`text-gray-800 dark:text-gray-200 mb-2 ${
					expanded ? '' : 'line-clamp-4'
				}`}
				ref={el => {
					if (el) {
						const isOverflowing = el.scrollHeight > el.clientHeight
						setIsClamped(isOverflowing && !expanded)
					}
				}}
			>
				{content.content}
			</div>
			<div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
				<div>{index + 1}分钟前</div>
				<div className="flex items-center space-x-2">
					<span>{content.content.length}字符</span>
					{isClamped && !expanded && (
						<button
							className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
							onClick={e => {
								e.stopPropagation()
								setExpanded(true)
							}}
						>
							展示全部
						</button>
					)}
					{expanded && (
						<button
							className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
							onClick={e => {
								e.stopPropagation()
								setExpanded(false)
							}}
						>
							收起
						</button>
					)}
					<button
						className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
						onClick={e => {
							e.stopPropagation()
							navigator.clipboard.writeText(content.content)
						}}
					>
						复制
					</button>
					<button
						className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
						onClick={onSave}
					>
						{content.isCollect ? (
							<Sparkle color="#f8dc54" size="20" />
						) : (
							<Sparkle size="20" />
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
