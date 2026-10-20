import { EHOT_KET } from './const'

export type T_HOT_KEY_TYPE = `${EHOT_KET}`

export type THotKeyRegisterFailedPayload = {
	type: 'OPEN' | 'CAPTURER'
	hotkey: string
}
