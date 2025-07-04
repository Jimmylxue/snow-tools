import { capturerShortCut } from './capturer'
import { openShortCut } from './open'

export function registerGlobalShortCut() {
	openShortCut.register()
	capturerShortCut.register()
}
