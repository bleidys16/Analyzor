import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from './store/store'
import client from './api/client'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

function AppContent() {
  const { setSessionId } = useStore()

  useEffect(() => {
    let sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = `sess_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
      localStorage.setItem('sessionId', sessionId)
    }
    setSessionId(sessionId)
    client.defaults.headers.common['X-Session-ID'] = sessionId
  }, [setSessionId])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard/:datasetId" element={<Dashboard />} />
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