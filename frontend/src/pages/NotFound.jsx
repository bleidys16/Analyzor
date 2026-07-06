import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', fontFamily: '"Space Grotesk", sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '500px', padding: '20px' }}>
        <div style={{
          fontSize: '72px', fontWeight: 700, color: '#ef4444', marginBottom: '16px',
          lineHeight: 1,
        }}>404</div>
        <h2 style={{ color: '#1e293b', fontSize: '20px', marginBottom: '8px' }}>Página no encontrada</h2>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
          La página que buscas no existe.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px', background: '#ef4444', color: 'white',
            border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
          }}
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  )
}
