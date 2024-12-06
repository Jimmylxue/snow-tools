import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Base } from '@/pages/base'
import { Setting } from './pages/setting'

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/base" element={<Base />} />
				<Route path="/setting" element={<Setting />} />
				<Route path="*" element={<Navigate to="/base" replace />} />
			</Routes>
		</Router>
	)
}

export default App
