import { BrowserWindow } from 'electron'
import { TWindows } from './type'

export type TRouterPage = 'base' | 'setting' | 'capturer'

type TRouterMap = {
	[key in TRouterPage]: TWindows
}

export function replace() {}

export class TNavigation {
	routerMap?: TRouterMap

	screenStack: BrowserWindow[] = []

	constructor() {}

	register(_routerMap: TRouterMap) {
		this.routerMap = _routerMap
	}

	replace(routerName: TRouterPage) {
		if (!this.routerMap) {
			throw new Error('请检查路由注册')
		}
		this.routerMap[routerName].show()
	}

	navigate() {}
}

export const navigate = new TNavigation()
