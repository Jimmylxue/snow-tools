import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Base } from '@/pages/base'
import { useClipBoardChange } from './hooks/clipboard/useClipBoardChange'
import { Capturer } from './pages/capturer'
import { HoverCapturer } from './pages/capturer/pages/hover'
import { About } from './pages/about'
import { Loading } from './components/common/Loading'
import { Translate } from './pages/translate'
import { GitMoji } from './pages/gitmoji'
import { Clipboard } from './pages/clipboard'
import { useEffect } from 'react'
import { sendNavigateBack } from './hooks/ipc/window'
import { SystemSetting } from './pages/setting'
import { ImageHosting } from './pages/imageHosting'
import { Hosts } from './pages/hosts'

function App() {
	useClipBoardChange()

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				/** 弹窗里的 Esc 只关闭弹窗，不要连整个工具窗口一起关掉 */
				if (
					document.querySelector(
						'[role="dialog"][data-state="open"], [role="listbox"][data-state="open"]',
					)
				) {
					return
				}
				event.preventDefault()
				sendNavigateBack()
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	return (
		<Router>
			<Routes>
				<Route path="/base" element={<Base />} />
				<Route path="/capturer" element={<Capturer />} />
				<Route path="/capturer/hover" element={<HoverCapturer />} />
				<Route path="/about" element={<About />} />
				<Route path="/translate" element={<Translate />} />
				<Route path="/gitmoji" element={<GitMoji />} />
				<Route path="/clipboard" element={<Clipboard />} />
				<Route path="/setting" element={<SystemSetting />} />
				<Route path="/imageHosting" element={<ImageHosting />} />
				<Route path="/hosts" element={<Hosts />} />
				<Route
					path="*"
					element={
						<div className=" w-full h-screen flex justify-center items-center">
							<Loading />
						</div>
					}
				/>
			</Routes>
		</Router>
	)
}

export default App
