import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Base } from '@/pages/base'
import { useClipBoardChange } from './hooks/clipboard/useClipBoardChange'
import { Capturer } from './pages/capturer'
import { HoverCapturer } from './pages/capturer/pages/hover'
import { About } from './pages/about'
import { Loading } from './components/common/Loading'

function App() {
	useClipBoardChange()
	return (
		<Router>
			<Routes>
				<Route path="/base" element={<Base />} />
				<Route path="/capturer" element={<Capturer />} />
				<Route path="/capturer/hover" element={<HoverCapturer />} />
				<Route path="/about" element={<About />} />
				{/* <Route path="/setting" element={<SystemSetting />} /> */}
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
