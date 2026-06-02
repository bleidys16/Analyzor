import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { datasetsAPI } from '../api/datasets'
import { analysisAPI } from '../api/analysis'
import { chatAPI } from '../api/chat'
import { exportAPI } from '../api/export'
import { useStore } from '../store/store'
import ChatMessages from '../components/Chat/ChatMessages'
import ChatInput from '../components/Chat/ChatInput'
import DynamicCharts from '../components/Dashboard/DynamicCharts'
import TopographicBackground from '../components/TopographicBackground'

export default function Dashboard() {
  const { datasetId } = useParams()
  const navigate = useNavigate()
  const { setCurrentDataset } = useStore()
  
  const [dataset, setDataset] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [messages, setMessages] = useState([])
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('analysis')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [allDatasets, setAllDatasets] = useState([])
  const [showDatasetList, setShowDatasetList] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    setIsDarkMode(savedTheme === 'dark')
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

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

        try {
          const allRes = await datasetsAPI.getAll()
          const all = allRes.data || []
          const seen = new Map()
          for (const ds of all) {
            const key = `${ds.name}_${ds.created_at?.slice(0, 10) || ''}`
            if (!seen.has(key) || new Date(ds.created_at) > new Date(seen.get(key).created_at)) {
              seen.set(key, ds)
            }
          }
          setAllDatasets(Array.from(seen.values()))
        } catch (_) {}
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

  const handleSendMessage = async (message) => {
    if (!message.trim()) return

    const userMsg = { role: 'user', content: message }
    setMessages([...messages, userMsg])
    
    setSending(true)
    try {
      const response = await chatAPI.sendMessage(datasetId, message)
      setMessages(prev => [...prev, response.data])
    } catch (err) {
      console.error('Error enviando mensaje:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error: No pude procesar tu pregunta. Intenta de nuevo.'
      }])
    } finally {
      setSending(false)
    }
  }

  if (loading) {
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
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid var(--card-border)',
              borderTop: '3px solid #ef4444',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Cargando dataset...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    )
  }

  if (analyzing || !analysis) {
    return (
      <>
        <TopographicBackground isDark={isDarkMode} />
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: '"Space Grotesk", sans-serif',
          position: 'relative',
          zIndex: 1,
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
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <TopographicBackground isDark={isDarkMode} />
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          fontFamily: '"Space Grotesk", sans-serif',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ textAlign: 'center', maxWidth: '500px', padding: '20px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" style={{ margin: '0 auto 20px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ color: '#ef4444', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>{error}</p>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 20px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Volver a Inicio
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopographicBackground isDark={isDarkMode} />
      <div style={{
        minHeight: '100vh',
        padding: '20px',
        fontFamily: '"Space Grotesk", sans-serif',
        position: 'relative',
        zIndex: 1,
        background: 'var(--bg-color)',
      }}>
        <style>{`
          .tab-btn {
            padding: 10px 16px;
            background: transparent;
            border: none;
            color: var(--text-muted);
            fontWeight: 600;
            fontSize: 13px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
          }
          .tab-btn.active {
            color: var(--accent);
            border-bottom-color: var(--accent);
          }
          .tab-btn:hover {
            color: var(--text-main);
          }
        `}</style>

        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          
          {/* HEADER */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '24px',
            borderBottom: '1px solid var(--card-border)',
            marginBottom: '24px',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '8px',
              }}>
                <button
                  onClick={() => navigate('/')}
                  style={{
                    background: 'var(--code-bg)',
                    border: 'none',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'var(--card-border)'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'var(--code-bg)'; e.currentTarget.style.color = 'var(--text-main)' }}
                  title="Volver"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '28px', 
                  fontWeight: 700, 
                  color: 'var(--text-main)',
                  letterSpacing: '-0.5px',
                }}>
                  {dataset?.name}
                </h1>
              </div>
              <p style={{ 
                margin: '8px 0 0 0', 
                color: 'var(--text-muted)', 
                fontSize: '12px',
                display: 'flex',
                gap: '12px',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  {dataset?.rows_count?.toLocaleString()} filas
                </span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span>{dataset?.columns?.length} columnas</span>
                <span style={{ color: 'var(--text-muted)' }}>•</span>
                <span>{(dataset?.file_size / 1024).toFixed(2)} KB</span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowDatasetList(true)}
                style={{
                  padding: '10px 16px',
                  background: 'var(--code-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--card-border)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'var(--code-bg)' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                Historial
              </button>

              <button
                onClick={handleExportPDF}
                style={{
                  padding: '10px 16px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  opacity: 0.9,
                }}
                onMouseOver={(e) => e.target.style.opacity = '1'}
                onMouseOut={(e) => e.target.style.opacity = '0.9'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                PDF
              </button>
            </div>
          </div>

          {/* TABS */}
          <div style={{
            display: 'flex',
            gap: '0',
            marginBottom: '24px',
            borderBottom: '1px solid var(--card-border)',
          }}>
            <button
              className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
              </svg>
              Análisis
            </button>
            <button
              className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Asistente IA
            </button>
            <button
              className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Vista Previa
            </button>
          </div>

          {/* CONTENT */}
          {activeTab === 'analysis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <DynamicCharts dataset={dataset} analysis={analysis} />
            </div>
          )}

          {activeTab === 'chat' && (
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--card-border)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              height: '550px',
            }}>
              <ChatMessages messages={messages} sending={sending} onSend={handleSendMessage} />
              <ChatInput 
                onSend={handleSendMessage} 
                sending={sending}
              />
            </div>
          )}

          {activeTab === 'preview' && dataset?.preview?.length > 0 && (
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--card-border)',
              padding: '20px',
              overflowX: 'auto',
            }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-main)',
              }}>
                Vista Previa ({dataset.preview.length} filas)
              </h3>
              <div style={{ overflowX: 'auto', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: 'var(--code-bg)', borderBottom: '1px solid var(--card-border)' }}>
                      {(dataset?.columns || []).map(col => (
                        <th key={col} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--card-border)' }}>
                        {(dataset?.columns || []).map(col => (
                          <td key={col} style={{ padding: '6px 10px', color: 'var(--text-main)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {String(row[col] ?? '').substring(0, 30)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL - DATASET LIST */}
      {showDatasetList && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'flex-end',
          zIndex: 999,
        }}>
          <style>{`
            @keyframes modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modal-slide-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .modal-overlay { animation: modal-fade-in 0.15s ease; }
            .modal-panel { animation: modal-slide-up 0.25s ease; }
          `}</style>

          <div className="modal-panel" style={{
            background: 'var(--card-bg)',
            width: '100%',
            maxWidth: '600px',
            borderRadius: '16px 16px 0 0',
            padding: '24px',
            maxHeight: '75vh',
            overflowY: 'auto',
            boxShadow: '0 -8px 30px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--card-border)',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--text-main)',
              }}>
                Mis Datasets ({allDatasets.length})
              </h2>
              <button
                onClick={() => setShowDatasetList(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--code-bg)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {allDatasets.map(ds => (
                <div
                  key={ds.id}
                  onClick={() => {
                    navigate(`/dashboard/${ds.id}`)
                    setShowDatasetList(false)
                  }}
                  style={{
                    background: ds.id === datasetId ? 'var(--accent-glow)' : 'var(--code-bg)',
                    border: ds.id === datasetId ? '1px solid var(--accent)' : '1px solid var(--card-border)',
                    borderRadius: '10px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseOver={(e) => {
                    if (ds.id !== datasetId) {
                      e.currentTarget.style.borderColor = 'var(--accent)'
                      e.currentTarget.style.background = 'var(--card-bg)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (ds.id !== datasetId) {
                      e.currentTarget.style.borderColor = 'var(--card-border)'
                      e.currentTarget.style.background = 'var(--code-bg)'
                    }
                  }}
                >
                  {ds.id === datasetId && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'var(--accent)',
                    }} />
                  )}

                  <h4 style={{
                    margin: '0 0 6px 0',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: ds.id === datasetId ? 'var(--accent)' : 'var(--text-main)',
                  }}>
                    {ds.name}
                    {ds.id === datasetId && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'var(--accent)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}>
                        actual
                      </span>
                    )}
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: '12px',
                  }}>
                    <span>{ds.rows_count?.toLocaleString() || 0} filas</span>
                    <span>•</span>
                    <span>{ds.columns?.length || 0} columnas</span>
                    <span>•</span>
                    <span>{new Date(ds.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}</span>
                  </p>
                </div>
              ))}
              {allDatasets.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', padding: '20px' }}>
                  No hay otros datasets disponibles
                </p>
              )}
            </div>
          </div>

          <div
            className="modal-overlay"
            onClick={() => setShowDatasetList(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: -1,
            }}
          />
        </div>
      )}
    </>
  )
}
