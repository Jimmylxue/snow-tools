import { TApp } from 'electron/biz/apps/type'
import { useEffect, useState } from 'react'
import { getIpc } from '../ipc'

const ipc = getIpc()

export function useApps() {
	const [apps, setApps] = useState<TApp[]>([])

	useEffect(() => {
		ipc.getInstalledApps().then((apps: TApp[]) => {
			setApps(apps)
		})
	}, [])

	return { apps }
}
