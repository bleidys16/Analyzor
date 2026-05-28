import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { datasetsAPI } from '../api/datasets'
import { analysisAPI } from '../api/analysis'
import { chatAPI } from '../api/chat'
import { exportAPI } from '../api/export'
import { useStore } from '../store/store'
import ChatMessages from '../components/Chat/ChatMessages'
import ChatInput from '../components/Chat/ChatInput'
import DynamicCharts from '../components/Dashboard/DynamicCharts'

export default function Dashboard() {
  const { datasetId } = useParams()
  console.log('Dataset ID from URL:', datasetId)
  const { setCurrentDataset } = useStore()
  const [dataset, setDataset] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const datasetResponse = await datasetsAPI.getById(datasetId)
        setDataset(datasetResponse.data)
        setCurrentDataset(datasetResponse.data)
        
        try {
          const analysisResponse = await analysisAPI.getAnalysis(datasetId)
          setAnalysis(analysisResponse.data)
        } catch (err) {
          await runAutoAnalysis(datasetId)
        }
        
        await loadChatHistory()
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

  const loadChatHistory = async () => {
    try {
      const response = await chatAPI.getHistory(datasetId)
      setMessages(response.data?.history || [])
    } catch (err) {
      console.error('Error cargando chat:', err)
    }
  }

  const handleSendMessage = async (message) => {
  if (!message.trim()) return

  // Añadir mensaje del usuario inmediatamente
  const userMsg = { role: 'user', content: message }
  setMessages([...messages, userMsg])
  
  setSending(true)
  try {
    const response = await chatAPI.sendMessage(datasetId, message)
    // Añadir respuesta del asistente
    setMessages(prev => [...prev, response.data])
  } catch (err) {
    console.error('Error enviando mensaje:', err)
    // Añadir mensaje de error
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: 'Error: No pude procesar tu pregunta. Intenta de nuevo.'
    }])
  } finally {
    setSending(false)
  }
}

  const handleExportPDF = async () => {
    try {
      const response = await exportAPI.exportPDF(datasetId, analysis)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${dataset?.name || 'reporte'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exportando PDF:', err)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
        fontFamily: '"Space Grotesk", sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--card-border)',
            borderTop: '3px solid var(--accent)',
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
        background: '#f8fafc',
        fontFamily: '"Space Grotesk", sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #ef4444',
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
        fontFamily: '"Space Grotesk", sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '20px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ margin: '0 auto 20px' }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ color: '#ef4444', fontSize: '16px', fontWeight: 600 }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      padding: '30px 20px',
      fontFamily: '"Space Grotesk", sans-serif',
    }}>
      <style>{`
        .stat-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s ease;
        }
        .stat-card:hover {
          border-color: #ef4444;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
        }
        .anomaly-card {
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px;
          border-left: 3px solid #ef4444;
        }
        .btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }
        .btn-secondary {
          background: transparent;
          color: #64748b;
          border: 1px solid #e2e8f0;
          padding: 8px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 12px;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '30px',
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '32px', 
              fontWeight: 700, 
              color: '#0f172a',
              letterSpacing: '-0.5px',
            }}>
              {dataset?.name || 'Dashboard'}
            </h1>
            <p style={{ 
              margin: 0, 
              color: '#64748b', 
              fontSize: '14px',
              display: 'flex',
              gap: '20px',
            }}>
              <span>{dataset?.rows_count?.toLocaleString()} filas</span>
              <span>•</span>
              <span>{dataset?.columns?.length} columnas</span>
              <span>•</span>
              <span>{(dataset?.file_size / 1024).toFixed(2)} KB</span>
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            style={{
              padding: '10px 20px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            Exportar PDF
          </button>
        </div>

        {/* Main Grid: Content + Chat */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '24px',
          minHeight: 'calc(100vh - 200px)',
        }}>
          {/* Left: Analysis */}
          <div style={{
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            <DynamicCharts dataset={dataset} analysis={analysis} />
          </div>

          {/* Right: Chat */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 180px)',
            position: 'sticky',
            top: '20px',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid #e2e8f0',
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '14px', 
                fontWeight: 700,
                color: '#0f172a',
              }}>
                Asistente IA
              </h3>
              <button
                onClick={() => {
                  chatAPI.clearChat(datasetId)
                  setMessages([])
                }}
                className="btn-secondary"
              >
                Limpiar
              </button>
            </div>

            <ChatMessages messages={messages} />
            <ChatInput 
              onSend={handleSendMessage} 
              datasetId={datasetId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}