import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopographicBackground from '../components/TopographicBackground'

export default function NotFound() {
  const navigate = useNavigate()
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <TopographicBackground isDark={isDarkMode} />
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
        fontFamily: '"Space Grotesk", sans-serif',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '20px' }}>
          <div style={{
            fontSize: '72px',
            fontWeight: 700,
            color: 'var(--accent)',
            marginBottom: '16px',
            lineHeight: 1,
          }}>404</div>
          <h2 style={{ color: 'var(--text-main)', fontSize: '20px', marginBottom: '8px' }}>Página no encontrada</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
            La página que buscas no existe.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 20px',
              background: 'var(--accent-strong)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    </>
  )
}
