import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { datasetsAPI } from '../api/datasets'
import { analysisAPI } from '../api/analysis'
import { chatAPI } from '../api/chat'
import { exportAPI } from '../api/export'
import { useStore } from '../store/store'
import ChatMessages from '../components/Chat/ChatMessages'
import ChatInput from '../components/Chat/ChatInput'
import DynamicCharts from '../components/Dashboard/DynamicCharts'
import InteractiveTable from '../components/Dashboard/InteractiveTable'
import TopographicBackground from '../components/TopographicBackground'
import { buildSuggestions } from '../engine/suggestions'
import { latestPerDay } from '../utils/datasets'

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
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [activeTableFilter, setActiveTableFilter] = useState(null)
  const [telemetryTime, setTelemetryTime] = useState(2.8)
  const [showSchemaInAssistant, setShowSchemaInAssistant] = useState(false)
  // El tema guardado se lee al crear el estado; el observador solo reacciona a cambios posteriores
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark'
    } catch {
      return false
    }
  })
  const [allDatasets, setAllDatasets] = useState([])
  const [showDatasetList, setShowDatasetList] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)

  const suggestions = useMemo(() => buildSuggestions(dataset, analysis), [dataset, analysis])

  const handleViewAnomalyRows = (anomaly) => {
    setActiveTab('preview')
    setActiveTableFilter({
      column: anomaly.column,
      type: 'IS_NULL',
      label: `Valores nulos en "${anomaly.column}"`,
    })
  }

  const handleAskAnomaly = (anomaly) => {
    setIsChatOpen(true)
    setShowSchemaInAssistant(false)
    const prompt = anomaly.type === 'high_missing'
      ? `Detecté que la columna "${anomaly.column}" tiene ${typeof anomaly.value === 'number' ? anomaly.value.toFixed(1) : ''}% de valores nulos. ¿Puedes analizar por qué ocurre y cómo impacta en las métricas?`
      : `Analiza la columna "${anomaly.column}": ${anomaly.message}. ¿Cuál es su distribución y qué patrón revela?`
    handleSendMessage(prompt)
  }

  // La lista de datasets se carga al abrir el modal (y solo la primera vez)
  const openDatasetList = async () => {
    setShowDatasetList(true)
    if (allDatasets.length > 0) return
    try {
      const response = await datasetsAPI.getAll()
      setAllDatasets(latestPerDay(response.data))
    } catch (err) {
      console.warn('No se pudo cargar la lista de datasets:', err)
    }
  }

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev
      const themeStr = next ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', themeStr)
      try {
        localStorage.setItem('theme', themeStr)
      } catch {
        // Ignore
      }
      return next
    })
  }

  // Carga el dataset, su análisis y el historial del chat. Cada dataset tiene su propia instancia
  // de esta página (ver DashboardRoute en App.jsx), así que no hace falta limpiar estados previos.
  useEffect(() => {
    if (!datasetId) return
    let cancelled = false

    const load = async () => {
      try {
        const datasetResponse = await datasetsAPI.getById(datasetId)
        if (cancelled) return
        setDataset(datasetResponse.data)
        setCurrentDataset(datasetResponse.data)

        try {
          const analysisResponse = await analysisAPI.getAnalysis(datasetId)
          if (!cancelled) setAnalysis(analysisResponse.data)
        } catch {
          // Si el análisis guardado falla, se recalcula desde el archivo
          if (!cancelled) setAnalyzing(true)
          try {
            const analysisResponse = await analysisAPI.autoAnalyze(datasetId)
            if (!cancelled) setAnalysis(analysisResponse.data)
          } catch (err) {
            console.error('Error en análisis:', err)
          } finally {
            if (!cancelled) setAnalyzing(false)
          }
        }

        try {
          const history = await chatAPI.getHistory(datasetId)
          if (!cancelled) setMessages(Array.isArray(history.data) ? history.data : [])
        } catch (err) {
          console.error('Error cargando chat:', err)
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || 'Error al cargar datos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [datasetId, setCurrentDataset])

  const handleExportPDF = async () => {
    setExportingPDF(true)
    try {
      const response = await exportAPI.exportPDF(datasetId)
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
    } finally {
      setExportingPDF(false)
    }
  }

  const handleSendMessage = async (message) => {
    if (!message.trim()) return

    const userMsg = { role: 'user', content: message }
    setMessages(prev => [...prev, userMsg])

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

  const handleClearChat = async () => {
    try {
      await chatAPI.clearChat(datasetId)
      setMessages([])
    } catch (err) {
      console.error('Error al borrar chat:', err)
    }
  }

  const handleRegenerate = async (assistantIdx) => {
    if (sending) return
    let question = ''
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') {
        question = messages[i].content
        break
      }
    }
    if (!question) return

    setMessages(prev => prev.slice(0, assistantIdx))
    setSending(true)
    try {
      const response = await chatAPI.sendMessage(datasetId, question)
      setMessages(prev => [...prev, response.data])
    } catch (err) {
      console.error('Error al regenerar respuesta:', err)
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
          <div style={{ textAlign: 'center' }} role="status" aria-live="polite">
            <div aria-hidden="true" style={{
              width: '40px',
              height: '40px',
              borderWidth: '3px',
              borderStyle: 'solid',
              borderColor: 'var(--card-border)',
              borderTopColor: 'var(--accent)',
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

  // El estado de error debe revisarse antes que "analizando": si la carga del dataset falló
  // (ej. un ID inexistente), `analysis` nunca deja de ser null y este chequeo se quedaría
  // mostrando el spinner para siempre en lugar de la pantalla de error ya diseñada.
  if (error) {
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
          <div style={{ textAlign: 'center', maxWidth: '500px', padding: '20px' }} role="alert" aria-live="assertive">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ margin: '0 auto 20px' }} aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ color: 'var(--accent-text)', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>{error}</p>
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
              Volver a Inicio
            </button>
          </div>
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
          background: 'var(--bg-color)',
          color: 'var(--text-main)',
          fontFamily: '"Space Grotesk", sans-serif',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ textAlign: 'center' }} role="status" aria-live="polite">
            <div aria-hidden="true" style={{
              width: '40px',
              height: '40px',
              borderWidth: '3px',
              borderStyle: 'solid',
              borderColor: 'var(--card-border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px',
            }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Analizando tu dataset...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
            color: var(--accent-text);
            border-bottom-color: var(--accent);
          }
          .tab-btn:hover {
            color: var(--text-main);
          }
          .btn-icon {
            background: var(--code-bg);
            border: none;
            color: var(--text-main);
            cursor: pointer;
            width: 36px;
            height: 36px;
            border-radius: 8px;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }
          .btn-icon:hover {
            background: var(--card-border);
            color: var(--accent);
          }
          .btn-ghost {
            padding: 10px 16px;
            background: var(--code-bg);
            border: 1px solid var(--card-border);
            border-radius: 8px;
            cursor: pointer;
            color: var(--text-main);
            font-weight: 600;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
          }
          .btn-ghost:hover {
            background: var(--card-border);
          }
          .btn-accent {
            padding: 10px 16px;
            background: var(--accent-strong);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
          }
          .btn-accent:hover {
            background: var(--accent-hover);
          }
          .btn-accent:disabled {
            cursor: wait;
            opacity: 0.7;
          }
          .modal-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--text-muted);
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.2s ease;
          }
          .modal-close:hover {
            background: var(--code-bg);
          }
          .ds-card {
            background: var(--code-bg);
            border: 1px solid var(--card-border);
            border-radius: 10px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
          }
          .ds-card.ds-card-active {
            background: var(--accent-glow);
            border-color: var(--accent);
          }
          .ds-card:not(.ds-card-active):hover {
            border-color: var(--accent);
            background: var(--card-bg);
          }
          .ds-del-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 14px;
            color: var(--text-muted);
            padding: 4px 6px;
            border-radius: 4px;
            transition: all 0.2s ease;
          }
          .ds-del-btn:hover {
            background: var(--accent-glow);
            color: var(--accent);
          }

          .dash-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--card-border);
            margin-bottom: 24px;
          }
          .dash-header-title {
            flex: 1;
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .dash-header-title h1 {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .dash-header-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }
          .scroll-hint {
            display: none;
            font-size: 11px;
            color: var(--text-muted);
            text-align: center;
            margin-top: 8px;
          }
          .dash-container {
            max-width: clamp(1400px, 94vw, 1780px);
            margin: 0 auto;
            width: 100%;
            padding: 0 clamp(16px, 2.5vw, 40px);
          }
          .dash-split-workspace {
            display: grid;
            grid-template-columns: minmax(0, 1fr) clamp(380px, 26vw, 460px);
            gap: clamp(16px, 2vw, 28px);
            align-items: start;
            transition: all 0.25s ease;
          }
          .dash-split-workspace.assistant-closed {
            grid-template-columns: minmax(0, 1fr);
          }
          .assistant-sidebar {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            height: calc(100vh - 200px);
            min-height: 580px;
            position: sticky;
            top: 20px;
            overflow: hidden;
            box-shadow: var(--shadow-card);
          }
          .assistant-mobile-backdrop {
            display: none;
          }
          @media (max-width: 1040px) {
            .dash-split-workspace {
              grid-template-columns: 1fr;
            }
            .assistant-sidebar {
              position: fixed;
              top: 0;
              right: 0;
              bottom: 0;
              width: 100%;
              max-width: 440px;
              height: 100vh;
              border-radius: 0;
              z-index: 1000;
              box-shadow: -10px 0 30px rgba(0, 0, 0, 0.3);
            }
            .assistant-mobile-backdrop {
              display: block;
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.45);
              backdrop-filter: blur(2px);
              z-index: 999;
            }
          }
          .query-workbench {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 280px;
            gap: 20px;
            align-items: start;
          }
          .query-panel {
            background: var(--card-bg);
            border-radius: 12px;
            border: 1px solid var(--card-border);
            padding: 20px;
            display: flex;
            flex-direction: column;
            height: calc(100vh - 270px);
            min-height: 560px;
          }
          .schema-inspector {
            background: var(--card-bg);
            border-radius: 12px;
            border: 1px solid var(--card-border);
            padding: 16px;
            position: sticky;
            top: 20px;
          }
          @media (max-width: 960px) {
            .query-workbench {
              grid-template-columns: 1fr;
            }
            .schema-inspector {
              display: none;
            }
            .query-panel {
              height: 550px;
            }
          }
          @media (max-width: 640px) {
            .dash-header-title h1 { font-size: 20px; }
            .dash-header-actions { width: 100%; }
            .dash-header-actions .btn-ghost,
            .dash-header-actions .btn-accent { flex: 1; justify-content: center; }
            .scroll-hint { display: block; }
          }
        `}</style>

        <div className="dash-container">

          {/* HEADER */}
          <div className="dash-header">
            <div className="dash-header-title">
              <button
                onClick={() => navigate('/')}
                className="btn-icon"
                title="Volver"
                aria-label="Volver a inicio"
                style={{ flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
              <div style={{ minWidth: 0 }}>
                <h1 title={dataset?.name} style={{
                  margin: 0,
                  fontSize: '28px',
                  fontWeight: 700,
                  color: 'var(--text-main)',
                  letterSpacing: '-0.5px',
                }}>
                  {dataset?.name}
                </h1>
                <p style={{
                  margin: '8px 0 0 0',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                    {dataset?.rows_count?.toLocaleString()} filas
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span>{dataset?.columns?.length} columnas</span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span>{(dataset?.file_size / 1024).toFixed(2)} KB</span>
                </p>
              </div>
            </div>

            <div className="dash-header-actions">
              <button
                onClick={openDatasetList}
                className="btn-ghost"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
                Historial
              </button>

              <button
                onClick={handleExportPDF}
                className="btn-accent"
                disabled={exportingPDF}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                {exportingPDF ? 'Generando…' : 'PDF'}
              </button>

              <button
                onClick={toggleTheme}
                className="btn-icon"
                title={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                aria-label={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              >
                {isDarkMode ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* TABS & ASSISTANT TOGGLE */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            borderBottom: '1px solid var(--card-border)',
            paddingBottom: '2px',
            flexWrap: 'wrap',
          }}>
            <button
              className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
              </svg>
              Análisis
            </button>
            <button
              className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
              </svg>
              Tabla Interactiva
            </button>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              style={{
                marginLeft: 'auto',
                padding: '7px 14px',
                borderRadius: '8px',
                border: isChatOpen ? '1px solid var(--accent)' : '1px solid var(--card-border)',
                background: isChatOpen ? 'var(--accent-glow)' : 'var(--code-bg)',
                color: isChatOpen ? 'var(--accent-text)' : 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
              aria-expanded={isChatOpen}
              aria-controls="assistant-sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>{isChatOpen ? 'Ocultar Asistente' : 'Abrir Asistente'}</span>
            </button>
          </div>

          {/* SPLIT VIEW WORKSPACE: ANÁLISIS / TABLA + ASISTENTE LATERAL */}
          <div className={`dash-split-workspace ${!isChatOpen ? 'assistant-closed' : ''}`}>
            {/* Panel Principal Izquierdo */}
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {activeTab === 'analysis' && (
                <DynamicCharts
                  datasetId={datasetId}
                  dataset={dataset}
                  analysis={analysis}
                  onViewAnomalyRows={handleViewAnomalyRows}
                  onAskAnomaly={handleAskAnomaly}
                />
              )}

              {activeTab === 'preview' && (
                <InteractiveTable
                  datasetId={datasetId}
                  dataset={dataset}
                  activeFilter={activeTableFilter}
                  onClearFilter={() => setActiveTableFilter(null)}
                  onExecutionTimeUpdate={(t) => setTelemetryTime(t)}
                  onAskAboutColumn={(col) => {
                    setIsChatOpen(true)
                    setShowSchemaInAssistant(false)
                    handleSendMessage(`¿Cuál es el resumen y valores principales de la columna "${col}"?`)
                  }}
                />
              )}
            </div>

            {/* Backdrop en dispositivos móviles y tablets */}
            {isChatOpen && (
              <div
                className="assistant-mobile-backdrop"
                onClick={() => setIsChatOpen(false)}
                aria-hidden="true"
              />
            )}

            {/* Panel Asistente Lateral (Split View Colapsable) */}
            {isChatOpen && (
              <aside id="assistant-sidebar" className="assistant-sidebar mobile-drawer" aria-label="Panel Asistente IA">
                {/* Header del Asistente */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--card-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--card-bg)',
                  flexShrink: 0,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <h2 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Asistente IA
                    </h2>
                    <span style={{
                      fontFamily: "'Geist Mono', monospace",
                      fontSize: '10px',
                      color: 'var(--accent-text)',
                      background: 'var(--accent-glow)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}>
                      DuckDB Local
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => setShowSchemaInAssistant(!showSchemaInAssistant)}
                      style={{
                        background: showSchemaInAssistant ? 'var(--accent-glow)' : 'transparent',
                        border: '1px solid var(--card-border)',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: showSchemaInAssistant ? 'var(--accent-text)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      title="Ver esquema de columnas"
                    >
                      Columnas ({dataset?.columns?.length || 0})
                    </button>
                    <button
                      onClick={() => setIsChatOpen(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Ocultar Asistente"
                      aria-label="Cerrar panel de asistente"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Contenido del Asistente: Chat o Esquema */}
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {showSchemaInAssistant ? (
                    <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                      <SchemaInspector
                        dataset={dataset}
                        analysis={analysis}
                        onSelectColumn={(col) => {
                          setShowSchemaInAssistant(false)
                          handleSendMessage(`¿Cuál es el resumen y valores principales de ${col}?`)
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 16px' }}>
                      <ChatMessages
                        messages={messages}
                        sending={sending}
                        onSend={handleSendMessage}
                        onRegenerate={handleRegenerate}
                        onClearChat={handleClearChat}
                        suggestions={suggestions}
                      />
                      <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                        <ChatInput
                          onSend={handleSendMessage}
                          sending={sending}
                          columns={dataset?.columns || []}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>

          {/* FOOTER: MICRO-INDICADOR DE RENDIMIENTO Y PRIVACIDAD */}
          <footer style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '28px 0 14px',
            marginTop: '40px',
            borderTop: '1px solid var(--card-border)',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 18px',
              borderRadius: '100px',
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              fontSize: '11px',
              fontFamily: "'Geist Mono', monospace",
              color: 'var(--text-muted)',
              boxShadow: 'var(--shadow-card)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              <span>
                Procesado en <strong style={{ color: 'var(--text-main)' }}>{telemetryTime > 0 ? `${telemetryTime.toFixed(1)} ms` : '< 3.0 ms'}</strong> en tu navegador (<strong style={{ color: 'var(--text-main)' }}>0 bytes</strong> enviados a servidores externos)
              </span>
            </div>
          </footer>
        </div>
      </div>

      {/* MODAL - DATASET LIST */}
      {showDatasetList && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          zIndex: 999,
        }}>
          <style>{`
            @keyframes modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modal-slide-up { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .modal-overlay {
              align-items: flex-end;
              justify-content: center;
              animation: modal-fade-in 0.15s ease;
            }
            .modal-panel {
              animation: modal-slide-up 0.25s ease;
              border-radius: 16px 16px 0 0;
            }
            @media (min-width: 641px) {
              .modal-overlay {
                align-items: center !important;
                padding: 20px;
              }
              .modal-panel {
                border-radius: 16px !important;
                border: 1px solid var(--card-border);
                box-shadow: var(--shadow-elevated) !important;
              }
            }
          `}</style>

          <div className="modal-panel" style={{
            background: 'var(--card-bg)',
            width: '100%',
            maxWidth: '600px',
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
                className="modal-close"
                aria-label="Cerrar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
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
                  className={'ds-card' + (ds.id === datasetId ? ' ds-card-active' : '')}
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

                  <h3 style={{
                    margin: '0 0 6px 0',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: ds.id === datasetId ? 'var(--accent-text)' : 'var(--text-main)',
                  }}>
                    {ds.name}
                    {ds.id === datasetId && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '10px',
                        fontWeight: 600,
                        background: 'var(--accent-strong)',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                      }}>
                        actual
                      </span>
                    )}
                  </h3>
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

function SchemaInspector({ dataset, analysis, onSelectColumn }) {
  const columns = dataset?.columns || []
  const dtypes = dataset?.dtypes || {}
  const dq = analysis?.data_quality || {}
  const anomalies = new Set((analysis?.anomalies || []).map(a => a.column))

  return (
    <div className="schema-inspector">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--card-border)',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '11px',
          fontWeight: 700,
          color: 'var(--text-main)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
        }}>
          Columnas ({columns.length})
        </h2>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Click para consultar
        </span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxHeight: '460px',
        overflowY: 'auto',
        paddingRight: '4px',
      }}>
        {columns.map(col => {
          const rawType = dtypes[col] || dq[col]?.dtype || ''
          const isNum = rawType.toLowerCase().includes('int') || rawType.toLowerCase().includes('float') || rawType.toLowerCase().includes('double')
          const hasAnomaly = anomalies.has(col)

          return (
            <button
              key={col}
              onClick={() => onSelectColumn?.(col)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: '"Geist", sans-serif',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.transform = 'translateX(2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)'
                e.currentTarget.style.transform = 'none'
              }}
              title={`Consultar columna "${col}"`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {col}
                </span>
                {hasAnomaly && (
                  <span title="Esta columna tiene una anomalía detectada" style={{ color: 'var(--warning)', fontSize: '11px' }} aria-hidden="true">⚑</span>
                )}
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: 600,
                color: isNum ? '#1d4ed8' : '#92400e',
                background: isNum ? '#eff6ff' : '#fef3c7',
                padding: '2px 6px',
                borderRadius: '4px',
                flexShrink: 0,
                textTransform: 'uppercase',
              }}>
                {rawType ? rawType.split('(')[0].substring(0, 7) : 'col'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
