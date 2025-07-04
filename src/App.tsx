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

function App() {
	useClipBoardChange()

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
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
