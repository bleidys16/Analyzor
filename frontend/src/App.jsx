import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import { STORAGE_KEYS, THEMES } from './utils/constants'

function AppContent() {
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
    const initialDark = savedTheme === THEMES.DARK
    document.documentElement.setAttribute('data-theme', initialDark ? THEMES.DARK : THEMES.LIGHT)
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard/:datasetId" element={<Dashboard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}