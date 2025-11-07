import { useUploadStaticImage } from '@/api/imageHost'
import { useState, useRef } from 'react'
import { toast } from 'sonner'

type UploadStatus = 'idle' | 'selected' | 'uploading' | 'success'

const sToast = (text: string) => {
	toast(text, {
		duration: 1500,
		style: {
			width: '640px',
			position: 'fixed',
			left: 20,
			bottom: 20,
		},
	})
}

export function ImageHosting() {
	const [isDragging, setIsDragging] = useState(false)
	const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [uploadedImage, setUploadedImage] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const { data, mutateAsync } = useUploadStaticImage()

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)

		const files = e.dataTransfer.files
		if (files.length > 0) {
			handleFileSelect(files[0])
		}
	}

	const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files
		if (files && files.length > 0) {
			handleFileSelect(files[0])
		}
	}

	const handleFileSelect = (file: File) => {
		if (!file.type.startsWith('image/')) {
			sToast('请上传图片文件')
			return
		}

		if (file.size > 10 * 1024 * 1024) {
			sToast('文件大小不能超过10MB')
			return
		}

		setSelectedFile(file)
		setUploadStatus('selected')

		// 预览图片
		const reader = new FileReader()
		reader.onload = e => {
			setUploadedImage(e.target?.result as string)
		}
		reader.readAsDataURL(file)
	}

	const handleUpload = async () => {
		if (!selectedFile) return

		setUploadStatus('uploading')

		// 模拟上传过程
		try {
			const formData = new FormData()
			formData.append('file', selectedFile)

			console.log('selectedFile', formData)
			// 这里应该是实际上传到图床的逻辑
			await mutateAsync(formData)

			setUploadStatus('success')
			sToast('图片上传成功')
		} catch (error) {
			setUploadStatus('selected')
			sToast('上传失败，请重试')
		}
	}

	const handleCopyLink = () => {
		if (uploadStatus === 'success') {
			navigator.clipboard.writeText(data!)
			sToast('链接已复制到剪贴板')
		}
	}

	const handleReset = () => {
		setSelectedFile(null)
		setUploadedImage(null)
		setUploadStatus('idle')
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	const getStatusConfig = () => {
		switch (uploadStatus) {
			case 'idle':
				return {
					text: '待选择',
					color: 'text-[#7f8fa4]',
					icon: 'info',
				}
			case 'selected':
				return {
					text: '待上传',
					color: 'text-[#487eb0]',
					icon: 'selected',
				}
			case 'uploading':
				return {
					text: '上传中',
					color: 'text-[#f39c12]',
					icon: 'uploading',
				}
			case 'success':
				return {
					text: '上传成功',
					color: 'text-[#28ca42]',
					icon: 'success',
				}
			default:
				return {
					text: '待选择',
					color: 'text-[#7f8fa4]',
					icon: 'info',
				}
		}
	}

	const statusConfig = getStatusConfig()

	return (
		<div className="w-full h-screen bg-[#f5f6fa] rounded-[10px] shadow-[0_2px_12px_0_rgba(0,0,0,0.08)] flex flex-col overflow-hidden border border-[#e0e3eb]">
			{/* Header */}
			<div className="flex items-center px-4 py-3 border-b border-[#e0e3eb] bg-white">
				<h2 className="text-lg font-medium text-[#2f3640]">图片上传</h2>
				<div className="ml-auto text-xs flex items-center">
					<span className={`flex items-center ${statusConfig.color}`}>
						{statusConfig.icon === 'info' && (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-3 w-3 mr-1"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						)}
						{statusConfig.icon === 'selected' && (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-3 w-3 mr-1"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						)}
						{statusConfig.icon === 'uploading' && (
							<div className="mr-1">
								<div className="animate-spin rounded-full h-3 w-3 border-t-2 border-[#f39c12] border-opacity-60"></div>
							</div>
						)}
						{statusConfig.icon === 'success' && (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-3 w-3 mr-1"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clipRule="evenodd"
								/>
							</svg>
						)}
						{statusConfig.text}
					</span>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex bg-white">
				{/* Upload Area */}
				<div className="flex-1 p-4 border-r border-[#e0e3eb]">
					<div
						className={`w-full h-full border-2 border-dashed rounded-[8px] transition-all duration-200 flex flex-col items-center justify-center ${
							isDragging
								? 'border-[#487eb0] bg-[#487eb0]/5'
								: uploadStatus === 'idle'
								? 'border-[#e0e3eb] hover:border-[#a4b0be]'
								: 'border-[#e0e3eb]'
						}`}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={() =>
							uploadStatus === 'idle' && fileInputRef.current?.click()
						}
					>
						{uploadStatus === 'idle' ? (
							<>
								<svg
									className="w-12 h-12 text-[#a4b0be] mb-3"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={1.5}
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								<p className="text-[#2f3640] font-medium mb-1">
									拖拽图片到此处
								</p>
								<p className="text-[#7f8fa4] text-sm text-center px-4">
									支持 JPG、PNG、GIF 等格式
									<br />
									文件大小不超过 10MB
								</p>
								<button className="mt-4 px-6 py-2 bg-[#487eb0] text-white rounded-[6px] text-sm font-medium hover:bg-[#386a9a] transition-colors">
									选择文件
								</button>
							</>
						) : (
							<div className="text-center">
								<div className="w-20 h-20 mx-auto mb-3 rounded-[6px] overflow-hidden border border-[#e0e3eb]">
									<img
										src={uploadedImage || ''}
										alt="Selected preview"
										className="w-full h-full object-cover"
									/>
								</div>
								<p className="text-[#2f3640] font-medium mb-2">
									{selectedFile?.name}
								</p>
								<p className="text-[#7f8fa4] text-sm mb-3">
									{(selectedFile?.size || 0) / 1024 / 1024 > 1
										? `${(selectedFile?.size || 0) / 1024 / 1024} MB`
										: `${Math.round((selectedFile?.size || 0) / 1024)} KB`}
								</p>
								<div className="flex justify-center">
									<button
										onClick={e => {
											e.stopPropagation()
											handleReset()
										}}
										className="px-4 py-1 text-[#7f8fa4] text-sm border border-[#e0e3eb] rounded-[4px] hover:bg-[#f5f6fa] transition-colors mx-1"
									>
										重新选择
									</button>
									{uploadStatus === 'selected' && (
										<button
											onClick={e => {
												e.stopPropagation()
												handleUpload()
											}}
											className="px-4 py-1 bg-[#487eb0] text-white text-sm rounded-[4px] hover:bg-[#386a9a] transition-colors mx-1"
										>
											上传图片
										</button>
									)}
									{uploadStatus === 'uploading' && (
										<button
											disabled
											className="px-4 py-1 bg-[#487eb0] text-white text-sm rounded-[4px] opacity-50 cursor-not-allowed mx-1"
										>
											上传中...
										</button>
									)}
								</div>
							</div>
						)}

						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileInput}
							accept="image/*"
							className="hidden"
						/>
					</div>
				</div>

				{/* Preview Area */}
				<div className="flex-1 p-4">
					<div className="w-full h-full border border-[#e0e3eb] rounded-[8px] bg-[#fafbfc] flex flex-col">
						<div className="px-3 py-2 border-b border-[#e0e3eb] bg-white rounded-t-[8px]">
							<h3 className="text-sm font-medium text-[#2f3640]">图片信息</h3>
						</div>

						<div className="flex-1 p-3">
							{uploadStatus !== 'idle' ? (
								<div className="space-y-3">
									<div className="flex justify-between text-sm">
										<span className="text-[#7f8fa4]">文件名:</span>
										<span className="text-[#2f3640] truncate max-w-[120px]">
											{selectedFile?.name}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-[#7f8fa4]">格式:</span>
										<span className="text-[#2f3640]">
											{selectedFile?.type.split('/')[1]?.toUpperCase() ||
												'未知'}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-[#7f8fa4]">大小:</span>
										<span className="text-[#2f3640]">
											{selectedFile?.size
												? selectedFile.size / 1024 / 1024 > 1
													? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
													: `${Math.round(selectedFile.size / 1024)} KB`
												: '0 KB'}
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-[#7f8fa4]">状态:</span>
										<span className={`font-medium ${statusConfig.color}`}>
											{statusConfig.text}
										</span>
									</div>

									{uploadStatus === 'success' && (
										<div className="pt-2">
											<button
												onClick={handleCopyLink}
												className="w-full py-2 bg-[#487eb0] text-white rounded-[6px] text-sm font-medium hover:bg-[#386a9a] transition-colors"
											>
												复制图片链接
											</button>
										</div>
									)}
								</div>
							) : (
								<div className="h-full flex items-center justify-center text-[#a4b0be] text-sm">
									选择图片后显示详细信息
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Footer Hint */}
			<div className="text-center py-2 text-xs text-[#a4b0be] bg-[#fafbfc] border-t border-[#e0e3eb]">
				<span className="inline-flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-3 w-3 mr-1"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clipRule="evenodd"
						/>
					</svg>
					{uploadStatus === 'idle'
						? '支持拖拽上传，点击选择文件'
						: uploadStatus === 'selected'
						? '点击"上传图片"按钮将图片上传到图床'
						: uploadStatus === 'uploading'
						? '图片上传中，请稍候...'
						: '上传成功，可复制图片链接使用'}
				</span>
			</div>
		</div>
	)
}
