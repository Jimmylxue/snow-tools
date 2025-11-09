import { Draggable } from '@/components/common/Draggable'
import { getIpc } from '@/hooks/ipc'
import { useElectron } from '@/hooks/useElectron'
import { useEffect } from 'react'

const ipc = getIpc()
export function HoverCapturer() {
	const { windowId, customData } = useElectron()

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				ipc.send(`HOVER_CAPTURER_SCREEN_CLOSE`, windowId)
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [windowId])

	return (
		customData &&
		windowId && (
			<div
				className=" w-screen h-screen flex items-center justify-center"
				onWheel={e => {
					const isScrollDown = e.deltaY > 0
					ipc.send(`WINDOW-RESIZE-${windowId}`, isScrollDown)
				}}
			>
				{/* 增加内边距给阴影留空间 */}
				{/* 阴影层 (蓝色发光效果) */}
				<div
					className="absolute inset-0 rounded-lg w-full h-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
					style={{
						backgroundColor: 'transparent',
						boxShadow: '0 0 5px 5px rgba(66, 133, 244, 0.6)', // Google蓝色阴影
						filter: 'blur(6px)',
						pointerEvents: 'none', // 不阻挡交互
						zIndex: 12,
					}}
				/>
				{/* 内容层 */}
				<Draggable>
					<div className="relative z-10 w-full h-full">
						<img
							src={customData?.params?.source}
							alt=""
							className="w-full h-full object-contain rounded-lg"
							onLoad={() => {
								ipc.send('SHOW_HOVER_SCREEN', windowId)
							}}
						/>
					</div>
				</Draggable>
			</div>
		)
	)
}
