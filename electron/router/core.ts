import { BrowserWindow } from 'electron'
import { TWindows } from './type'

export type TRouterPage =
	| 'base'
	| 'setting'
	| 'capturer'
	| 'about'
	| 'translate'
	| 'gitmoji'
	| 'clipboard'

type TRouterMap = {
	[key in TRouterPage]: TWindows
}

export function replace() {}

export class TNavigation {
	routerMap?: TRouterMap

	/**
	 * @deprecated 后续支持多页面展示 会实现这个功能
	 */
	screenStack: BrowserWindow[] = []

	currentRouter: TRouterPage = 'base'

	constructor() {}

	private hideAll() {
		if (this.routerMap) {
			for (const router of Object.values(this.routerMap)) {
				router.instance?.hide()
			}
		}
	}

	register(_routerMap: TRouterMap) {
		this.routerMap = _routerMap
	}

	replace(routerName: TRouterPage) {
		if (!this.routerMap) {
			throw new Error('请检查路由注册')
		}
		this.routerMap[routerName].show()
	}

	navigate(routerName: TRouterPage) {
		this.hideAll()
		this.routerMap?.[routerName].show()
		this.currentRouter = routerName
	}

	/**
	 * 单个页面场景下的back
	 */
	singleBack() {
		if (this.currentRouter === 'base') {
			this.routerMap?.['base'].close()
			return
		}
		this.routerMap?.[this.currentRouter].close()
		this.routerMap?.['base'].show()
		this.currentRouter = 'base'
	}
}

export const navigate = new TNavigation()
