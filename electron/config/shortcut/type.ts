export enum EShortCutKey {
	软件开启 = 'snow-tools-open_hotkey',
	截屏 = 'snow-tools-capturer_hotkey',
}

export interface TShortCut {
	shortcutKey: EShortCutKey

	destroy: () => void

	register: () => void
}
