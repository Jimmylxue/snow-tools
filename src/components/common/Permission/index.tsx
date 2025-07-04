interface PermissionPromptProps {
	onRequestPermission: () => void
	onClose?: () => void
	className?: string
}

export const PermissionPrompt = ({
	onRequestPermission,
	onClose,
	className = '',
}: PermissionPromptProps) => {
	return (
		<div
			className={`w-full h-screen flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}
		>
			{/* 头部 */}
			<div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-b from-gray-50 to-gray-50/50 relative">
				<div className="flex items-center space-x-2">
					<h2 className="text-lg font-medium text-gray-800">权限申请</h2>
				</div>

				{/* ESC提示 */}
				<div
					className="absolute right-6 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 cursor-pointer"
					onClick={onClose}
				>
					<kbd className="px-2 py-1 bg-gray-100 text-xs text-gray-500 rounded-md border border-gray-200">
						ESC
					</kbd>
					<span className="text-xs text-gray-400">退出</span>
				</div>
			</div>

			{/* 内容区域 */}
			<div className="flex-1 p-8 flex flex-col items-center justify-center bg-gray-50/30">
				<div className="text-center max-w-md">
					<div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
						<svg
							className="w-10 h-10 text-blue-500"
							viewBox="0 0 24 24"
							fill="none"
						>
							<path
								d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</div>

					<h3 className="text-xl font-semibold text-gray-800 mb-3">
						需要辅助功能权限
					</h3>

					<p className="text-gray-500 mb-6 leading-relaxed">
						snow-tools
						需要获取辅助功能权限才能正常使用全局快捷键、屏幕截图等核心功能。
					</p>

					{/* 主要操作按钮 */}
					<div className="space-y-3">
						<button
							onClick={onRequestPermission}
							className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2"
						>
							前往系统设置授权
						</button>

						{/* 新增刷新提示 */}
						<div className="text-xs text-gray-400 pt-2 flex items-center justify-center">
							<span>或</span>
							<button
								onClick={onRequestPermission}
								className="ml-1 text-blue-500 hover:text-blue-600 hover:underline focus:outline-none"
							>
								点击这里刷新权限状态
							</button>
							<span>（完成授权后）</span>
						</div>
					</div>
				</div>
			</div>

			{/* 底部指引 */}
			<div className="bg-gray-50 px-6 py-4 border-t border-gray-100 text-center">
				<p className="text-xs text-gray-400 flex items-center justify-center space-x-1">
					<svg
						className="w-3 h-3"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>系统偏好设置 → 安全性与隐私 → 隐私 → 辅助功能</span>
				</p>
			</div>
		</div>
	)
}
