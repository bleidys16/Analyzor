import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { datasetsAPI } from '../api/datasets'
import { useStore } from '../store/store'

export default function Dashboard() {
  const { sessionId: datasetId } = useParams()
  const { setCurrentDataset } = useStore()
  const [dataset, setDataset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDataset = async () => {
      try {
        const response = await datasetsAPI.getById(datasetId)
        setDataset(response.data)
        setCurrentDataset(response.data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar dataset')
      } finally {
        setLoading(false)
      }
    }

    if (datasetId) {
      fetchDataset()
    }
  }, [datasetId, setCurrentDataset])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px',
          }} />
          <p style={{ color: '#64748b', fontSize: '14px' }}>Analizando tu dataset...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}>
        <p style={{ color: '#ef4444', fontSize: '16px' }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '30px',
      fontFamily: '"Space Grotesk", sans-serif',
    }}>
      <h1>{dataset?.name || 'Dashboard'}</h1>
      <p>Dataset ID: {datasetId}</p>
      <p>Columnas: {dataset?.columns?.length || 0}</p>
      <p>Filas: {dataset?.rows_count || 0}</p>
      {/* Aquí irán los gráficos y el chat */}
    </div>
  )
}
