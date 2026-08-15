import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import DayDetail from './pages/DayDetail'
import Review from './pages/Review'
import Mastered from './pages/Mastered'
import Hard from './pages/Hard'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/day/:day" element={<DayDetail />} />
          <Route path="/review/:day" element={<Review />} />
          <Route path="/mastered" element={<Mastered />} />
          <Route path="/hard" element={<Hard />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
