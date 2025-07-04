import { TRouterPage } from 'electron/router/core'

export type TTools = {
	id: number
	icon: string
	name: string
	recommended: boolean
	iconUrl: string
	routerName: TRouterPage
}
