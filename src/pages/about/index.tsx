import { Github } from 'lucide-react'
export function About() {
	const openExternal = (url: string) => {
		console.log('oooooo')
		window.ipcRenderer.openExternal(url)
	}
	return (
		<div className="w-[500px] h-screen bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col">
			{/* 顶部渐变装饰条 */}
			{/* <div className="h-2 bg-gradient-to-r from-blue-400 to-purple-500"></div> */}

			{/* 主要内容 */}
			<div className="flex-1 flex flex-col pt-8 px-6 pb-6">
				{/* Logo和标题 */}
				<div className="flex flex-col items-center mb-5">
					<div className="w-16 h-16 bg-white rounded-xl shadow-sm  flex items-center justify-center mb-3">
						<img src="/logo.png" alt="" />
					</div>
					<h1 className="text-xl font-semibold text-gray-800">Snow Tools</h1>
					<p className="text-xs text-gray-400 mt-1">
						Version {import.meta.env.VITE_APP_APP_VERSION}
					</p>
				</div>

				{/* 描述文本 */}
				<div className="text-center mb-6 px-8">
					<p className="text-sm text-gray-600 leading-relaxed">
						Snow Tools 是一款轻量级的开发者工具集合，旨在提高您的工作效率。
					</p>
				</div>

				{/* 功能亮点 */}
				<div className="grid grid-cols-3 gap-3 mb-6">
					{[
						{
							title: '简洁高效',
							icon: (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="currentColor"
									className="w-5 h-5 text-blue-500"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
									/>
								</svg>
							),
							color: 'text-blue-500',
						},
						{
							title: '完全开源',
							icon: (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="currentColor"
									className="w-5 h-5 text-purple-500"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
									/>
								</svg>
							),
							color: 'text-purple-500',
						},
						{
							title: '跨平台',
							icon: (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									strokeWidth={1.5}
									stroke="currentColor"
									className="w-5 h-5 text-green-500"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
									/>
								</svg>
							),
							color: 'text-green-500',
						},
					].map(feature => (
						<div
							key={feature.title}
							className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center group"
						>
							<div
								className={`w-10 rounded-full ${feature.color} bg-opacity-10 flex items-center justify-center mb-2 group-hover:bg-opacity-20 transition-all`}
							>
								{feature.icon}
							</div>
							<p className="text-xs font-semibold text-gray-700">
								{feature.title}
							</p>
						</div>
					))}
				</div>

				{/* 底部链接 */}
				<div className="mt-auto flex justify-center space-x-4">
					<div
						className="flex items-center text-xs text-gray-600 hover:text-blue-500 transition-colors cursor-pointer "
						onClick={() => {
							console.log('<<<<<<')
							openExternal('https://github.com/Jimmylxue/snow-tools')
						}}
					>
						<Github size="16" className=" mr-1" />
						GitHub
					</div>
					{/* <span className="text-gray-300">|</span>
					<div
						onClick={() => {
							openExternal('mailto:1002661758@qq.com')
						}}
						className="text-xs text-gray-600 hover:text-blue-500 transition-colors flex items-center cursor-pointer"
					>
						<Mail size="16" className=" mr-1" />
						Email
					</div> */}
				</div>
			</div>
		</div>
	)
}
