import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Base } from '@/pages/base'
import { useClipBoardChange } from './hooks/clipboard/useClipBoardChange'
import { Capturer } from './pages/capturer'
import { HoverCapturer } from './pages/capturer/pages/hover'

function App() {
	useClipBoardChange()
	return (
		<Router>
			<Routes>
				<Route path="/base" element={<Base />} />
				<Route path="/capturer" element={<Capturer />} />
				<Route path="/capturer/hover" element={<HoverCapturer />} />
				{/* <Route path="/setting" element={<SystemSetting />} /> */}
				<Route path="*" element={<Navigate to="/base" replace />} />
			</Routes>
		</Router>
	)
}

export default App
