import { TCopyItem } from 'electron/biz/clipboard/type'
import { useEffect, useState } from 'react'
import { ImageOff, Sparkle } from 'lucide-react'
import { formatDistanceTime } from '@/utils/time'
import {
	copyClipboardImage,
	getClipboardImageThumbnail,
} from '@/hooks/ipc/clipboard'

type TProps = {
	content: TCopyItem
	index: number
	isSelected: boolean
	onClick: () => void
	onDoubleClick: () => void
	/**
	 * 收藏
	 */
	onSave: (status: boolean) => void
}

function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 图片条目：缩略图按需向主进程要，原图始终留在磁盘上 */
function ImagePreview({ fileName }: { fileName: string }) {
	const [src, setSrc] = useState<string | null>(null)
	const [failed, setFailed] = useState(false)

	useEffect(() => {
		let cancelled = false

		getClipboardImageThumbnail(fileName)
			.then(dataUrl => {
				if (cancelled) return
				if (dataUrl) setSrc(dataUrl)
				else setFailed(true)
			})
			.catch(() => {
				if (!cancelled) setFailed(true)
			})

		return () => {
			cancelled = true
		}
	}, [fileName])

	if (failed) {
		return (
			<div className="mb-2 flex h-20 items-center justify-center rounded-md border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-600 dark:text-gray-500">
				<ImageOff className="mr-1 size-4" />
				图片已清理
			</div>
		)
	}

	if (!src) {
		return (
			<div className="mb-2 h-20 w-32 animate-pulse rounded-md bg-gray-100 dark:bg-gray-700" />
		)
	}

	return (
		<img
			src={src}
			alt="剪贴板图片"
			className="mb-2 max-h-40 w-auto rounded-md border border-gray-200 object-contain dark:border-gray-700"
			draggable={false}
		/>
	)
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

	const isImage = content.type === 'IMAGE' && !!content.image

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
			{isImage ? (
				<ImagePreview fileName={content.image!.fileName} />
			) : (
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
			)}

			<div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
				<div>{formatDistanceTime(content.createdTime)}</div>
				<div className="flex items-center space-x-2">
					<span>
						{isImage
							? `${content.image!.width}×${content.image!.height}`
							: `${content.content.length}字符`}
					</span>
					{isImage && <span>{formatBytes(content.image!.size)}</span>}
					{!isImage && isClamped && !expanded && (
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
					{!isImage && expanded && (
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
							if (isImage) {
								void copyClipboardImage(content.image!.fileName)
								return
							}
							navigator.clipboard.writeText(content.content)
						}}
					>
						复制
					</button>
					<button
						className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
						onClick={() => onSave(content.isCollect ? false : true)}
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
