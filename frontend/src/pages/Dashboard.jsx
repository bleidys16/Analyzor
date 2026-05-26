import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { datasetsAPI } from '../api/datasets'
import { analysisAPI } from '../api/analysis'
import { useStore } from '../store/store'

export default function Dashboard() {

  const { sessionId: datasetId } = useParams()
  const { setCurrentDataset } = useStore()
  const [dataset, setDataset] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar dataset
        const datasetResponse = await datasetsAPI.getById(datasetId)
        setDataset(datasetResponse.data)
        setCurrentDataset(datasetResponse.data)
        
        // Intentar cargar análisis existente
        try {
          const analysisResponse = await analysisAPI.getAnalysis(datasetId)
          setAnalysis(analysisResponse.data)
        } catch (err) {
          // Si no existe análisis, iniciar automáticamente
          await runAutoAnalysis(datasetId)
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Error al cargar datos')
      } finally {
        setLoading(false)
      }
    }

    if (datasetId) {
      fetchData()
    }
  }, [datasetId, setCurrentDataset])

  const runAutoAnalysis = async (id) => {
    setAnalyzing(true)
    try {
      const response = await analysisAPI.autoAnalyze(id)
      setAnalysis(response.data)
    } catch (err) {
      console.error('Error en análisis:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-color)',
          color: 'var(--text-main)',
        }}
      >

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
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Cargando dataset...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (analyzing || !analysis) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
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
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Analizando tu dataset...</p>
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
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
      }}>
        <p style={{ color: '#ef4444', fontSize: '16px' }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-color)',
      padding: '30px',
      color: 'var(--text-main)',
      fontFamily: '"Space Grotesk", sans-serif',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
        }}>
          <div>
            <h1 style={{ margin: '0 0 5px 0', fontSize: '32px', fontWeight: 700 }}>
              {dataset?.name || 'Dashboard'}
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
              {dataset?.rows_count?.toLocaleString()} filas • {dataset?.columns?.length} columnas
            </p>
          </div>
          <button style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}>
            Exportar PDF
          </button>
        </div>

        {/* Main Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '20px',
          minHeight: 'calc(100vh - 200px)',
        }}>
          {/* Left: Analysis */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            border: '1px solid var(--card-border)',
            padding: '20px',
            color: 'var(--text-main)',
            overflowY: 'auto',
          }}>
            <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600 }}>
              Análisis Automático
            </h2>

            {/* Data Quality Cards */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                Calidad de Datos
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
              }}>
                {dataset?.columns?.slice(0, 4).map((col) => (
                  <div key={col} style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px',
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      {col}
                    </p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600 }}>
                      {analysis?.data_quality?.[col]?.dtype || 'unknown'}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                      {analysis?.data_quality?.[col]?.null_pct?.toFixed(1)}% nulos
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomalías */}
            {analysis?.anomalies?.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 600, color: '#dc2626' }}>
                  ⚠️ Anomalías Detectadas
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {analysis?.anomalies?.map((anomaly, idx) => (
                    <div key={idx} style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '10px',
                    }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#991b1b' }}>
                        {anomaly.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Estadísticas */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                Estadísticas
              </h3>
              <div style={{
                overflowX: 'auto',
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>
                        Columna
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>
                        Media
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>
                        Mediana
                      </th>
                      <th style={{ padding: '8px', textAlign: 'left', fontWeight: 600, color: '#64748b' }}>
                        Desv Std
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataset?.columns?.slice(0, 5).map((col) => {
                      const stats = analysis?.statistics?.[col]
                      if (!stats?.mean) return null
                      return (
                        <tr key={col} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px', color: '#1a1a1a' }}>{col}</td>
                          <td style={{ padding: '8px', color: '#64748b' }}>
                            {stats.mean?.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px', color: '#64748b' }}>
                            {stats.median?.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px', color: '#64748b' }}>
                            {stats.std?.toFixed(2)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Preview */}
            <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
              Preview de Datos
            </h3>
            <div style={{
              overflowX: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '12px',
              }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {dataset?.columns?.slice(0, 5).map((col, idx) => (
                      <th key={idx} style={{
                        padding: '8px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#64748b',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset?.preview?.slice(0, 5).map((row, ridx) => (
                    <tr key={ridx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {dataset?.columns?.slice(0, 5).map((col, cidx) => (
                        <td key={cidx} style={{
                          padding: '8px',
                          color: '#1a1a1a',
                        }}>
                          {String(row[col] || '').substring(0, 25)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Chat */}
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '15px',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 180px)',
            position: 'sticky',
            top: '20px',
          }}>
            <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: 600 }}>
              Asistente IA
            </h3>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: '15px',
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: '15px',
              minHeight: '300px',
            }}>
              <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '50px' }}>
                Haz preguntas sobre tus datos
              </p>
            </div>
            <input
              type="text"
              placeholder="Pregunta..."
              style={{
                padding: '8px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: '"Space Grotesk", sans-serif',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}