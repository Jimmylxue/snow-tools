export type TSpotlightShortcutState = {
	supported: boolean
	available: boolean
	disabled: boolean
	message?: string
}

export type TSpotlightShortcutResult = {
	ok: boolean
	disabled?: boolean
	message?: string
}
