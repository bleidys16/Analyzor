import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useStore } from './store/store'
import client from './api/client'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'

function App() {
  const { setSessionId } = useStore()

  useEffect(() => {
    // Generar o recuperar sessionId
    let sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = `sess_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`
      localStorage.setItem('sessionId', sessionId)
    }
    setSessionId(sessionId)

    // Agregar a todas las requests
    client.defaults.headers.common['X-Session-ID'] = sessionId
  }, [setSessionId])

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard/:sessionId" element={<Dashboard />} />
      </Routes>
    </Router>
  )
}

export default App