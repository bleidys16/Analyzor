import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store/store'
import client from './api/client'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import NotFound from './pages/NotFound'
import { STORAGE_KEYS, THEMES } from './utils/constants'

function AppContent() {
  const { setSessionId } = useStore()

  useEffect(() => {
    let sessionId = localStorage.getItem(STORAGE_KEYS.SESSION_ID)
    if (!sessionId) {
      sessionId = `sess_${crypto.randomUUID().slice(0, 8)}_${Date.now()}`
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId)
    }
    setSessionId(sessionId)
    client.defaults.headers.common['X-Session-ID'] = sessionId

    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME)
    const initialDark = savedTheme === THEMES.DARK
    document.documentElement.setAttribute('data-theme', initialDark ? THEMES.DARK : THEMES.LIGHT)
  }, [setSessionId])

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