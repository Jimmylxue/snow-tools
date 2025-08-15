export type TApp = {
	/**
	 * appName 做了本土化App的处理 一些应用名是本土化应用名
	 */
	appName: string
	iconUrl: string
	nativePath: string
	/**
	 * 系统中的 AppName 打开App时使用这个更可靠
	 */
	originAppName: string
}
