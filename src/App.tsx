import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Base } from '@/pages/base'
// import { SystemSetting } from './pages/setting'

function App() {
	return (
		<Router>
			<Routes>
				<Route path="/base" element={<Base />} />
				{/* <Route path="/setting" element={<SystemSetting />} /> */}
				<Route path="*" element={<Navigate to="/base" replace />} />
			</Routes>
		</Router>
	)
}

export default App
