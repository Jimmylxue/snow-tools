export type TApp = {
	/**
	 * Finder 里显示的名字（跟随系统语言）
	 */
	appName: string
	/**
	 * .app 包的文件名，检索时一起参与匹配
	 */
	originAppName: string
	/**
	 * PNG data URL，直接给 <img src> 用
	 */
	iconUrl: string
	/**
	 * .app 包绝对路径，启动时使用
	 */
	appPath: string
}
