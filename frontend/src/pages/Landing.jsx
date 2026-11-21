import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { datasetsAPI } from '../api/datasets'
import TopographicBackground from '../components/TopographicBackground'
import StatsChart from '../components/StatsChart'
import ChartRenderer from '../components/Chat/ChartRenderer'
import { latestPerDay } from '../utils/datasets'

// Gráfico de ejemplo fijo: demuestra el mecanismo real (pregunta -> gráfico), no llama al motor.
const DEMO_CHART = {
  type: 'bar',
  title: 'Ingresos totales por categoría',
  data: [
    { name: 'Electrónica', value: 42800 },
    { name: 'Hogar', value: 31200 },
    { name: 'Ropa', value: 24600 },
    { name: 'Deportes', value: 18900 },
  ],
}

export default function Landing() {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [datasets, setDatasets] = useState([])
  const [datasetsLoading, setDatasetsLoading] = useState(true)
  const [activeFeatureSlide, setActiveFeatureSlide] = useState(0)

  // Theme state (Light is default); se restaura el tema guardado al crear el estado
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('theme') === 'dark'
    } catch {
      return false
    }
  })

  useEffect(() => {
    let cancelled = false
    datasetsAPI.getAll()
      .then((response) => {
        if (!cancelled) setDatasets(latestPerDay(response.data))
      })
      .catch((err) => console.warn('No se pudo cargar la lista de datasets:', err))
      .finally(() => {
        if (!cancelled) setDatasetsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = e.dataTransfer.files
    if (droppedFiles[0]) {
      const droppedFile = droppedFiles[0]
      if (droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile)
        setError(null)
        scrollToUploadZone()
      } else {
        setError('Por favor sube un archivo CSV válido')
      }
    }
  }

  const handleChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile && selectedFile.name.endsWith('.csv')) {
      setFile(selectedFile)
      setError(null)
      scrollToUploadZone()
    } else {
      setError('Por favor selecciona un archivo CSV válido')
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Selecciona un archivo primero')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const response = await datasetsAPI.upload(file)
      navigate(`/dashboard/${response.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.detail || 'Error al procesar el archivo CSV')
      setUploading(false)
    }
  }

  const handleSample = async () => {
    setUploading(true)
    setError(null)

    try {
      const response = await datasetsAPI.loadSample()
      navigate(`/dashboard/${response.data.id}`)
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar el dataset de ejemplo')
      setUploading(false)
    }
  }

  const triggerFileInput = () => {
    document.getElementById('fileInput').click()
  }

  const scrollToUploadZone = () => {
    const el = document.getElementById('upload-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const FEATURE_SLIDES = [
    {
      kicker: '01 / CONSULTAS INTELIGENTES',
      tabLabel: 'Consultas en lenguaje natural',
      title: 'Pregunta en español, obtén números y gráficos',
      bullets: [
        { label: 'Sin código:', text: 'Escribe dudas como "¿cuánto vendimos?" y obtén respuestas visuales al instante.' },
        { label: 'SQL transparente:', text: 'Revisa y edita las consultas generadas si eres developer.' },
        { label: 'Modo local:', text: 'Motor de reglas activo incluso si la IA no está disponible.' },
      ],
      renderWidget: () => (
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          height: '100%',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--card-border)',
          }}>
            <span style={{
              fontSize: '11px',
              fontFamily: "'Geist Mono', monospace",
              fontWeight: 700,
              letterSpacing: '1px',
              color: 'var(--accent-text)',
            }}>
              CONSULTA &gt;_
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'Geist Mono', monospace" }}>
              SQL en tiempo real
            </span>
          </div>

          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: 'var(--text-main)',
            border: '1px solid var(--card-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ color: 'var(--accent-text)', fontWeight: 700, fontFamily: "'Geist Mono', monospace" }}>&gt;</span>
            <span>"¿Cuáles son las ventas totales por categoría este año?"</span>
          </div>

          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontFamily: "'Geist Mono', monospace",
            fontSize: '11px',
            color: 'var(--text-muted)',
            border: '1px solid var(--card-border)',
            overflowX: 'auto',
          }}>
            <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>SELECT</span> categoria, <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>SUM</span>(monto) <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>AS</span> total <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>GROUP BY</span> 1;
          </div>

          <div style={{ marginTop: '4px' }}>
            <ChartRenderer chartConfig={DEMO_CHART} />
          </div>
        </div>
      ),
    },
    {
      kicker: '02 / PRIVACIDAD & VELOCIDAD',
      tabLabel: 'DuckDB en tu navegador',
      title: 'Tus datos nunca salen de tu computadora',
      bullets: [
        { label: '100% privado:', text: 'Todo corre en la memoria RAM de tu navegador con DuckDB.' },
        { label: 'Cero nube:', text: 'Tu archivo CSV jamás se transfiere ni almacena en servidores.' },
        { label: 'Ultrarrápido:', text: 'Filtra y agrupa miles de filas en milisegundos.' },
      ],
      renderWidget: () => (
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          height: '100%',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '10px',
            borderBottom: '1px solid var(--card-border)',
          }}>
            <span style={{
              fontSize: '11px',
              fontFamily: "'Geist Mono', monospace",
              fontWeight: 700,
              letterSpacing: '1px',
              color: 'var(--accent-text)',
            }}>
              MOTOR DUCKDB-WASM
            </span>
            <span style={{
              fontSize: '10px',
              fontFamily: "'Geist Mono', monospace",
              background: 'var(--accent-glow)',
              color: 'var(--accent-text)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontWeight: 600,
            }}>
              EN TU NAVEGADOR
            </span>
          </div>

          <div style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'var(--card-bg)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid var(--card-border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '2px' }}>
              <span>Columna</span>
              <span>Tipo</span>
              <span>Datos</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>id_venta</span>
              <span style={{ color: 'var(--accent-text)' }}>NUMÉRICO</span>
              <span style={{ color: 'var(--text-muted)' }}>10,000 filas</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>categoria</span>
              <span style={{ color: 'var(--accent-text)' }}>TEXTO</span>
              <span style={{ color: 'var(--text-muted)' }}>4 tipos</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>monto_usd</span>
              <span style={{ color: 'var(--accent-text)' }}>DECIMAL</span>
              <span style={{ color: 'var(--text-muted)' }}>Prom. $2,450</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>fecha</span>
              <span style={{ color: 'var(--accent-text)' }}>FECHA</span>
              <span style={{ color: 'var(--text-muted)' }}>2024-2026</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--text-muted)',
            fontFamily: "'Geist Mono', monospace",
            padding: '2px 2px 0',
          }}>
            <span>Velocidad: &lt; 8ms</span>
            <span>En la nube: 0 bytes</span>
            <span>Privacidad: 100%</span>
          </div>
        </div>
      ),
    },
    {
      kicker: '03 / SALUD DE DATOS & REPORTES',
      tabLabel: 'Salud de datos y PDF',
      title: 'Detecta anomalías y descarga informes PDF',
      bullets: [
        { label: 'Auditoría al instante:', text: 'Alertas de valores nulos, duplicados y atípicos.' },
        { label: 'Patrones clave:', text: 'Descubre qué variables influyen más en tus ventas.' },
        { label: 'PDF en 1 clic:', text: 'Exporta un informe ejecutivo listo para compartir o imprimir.' },
      ],
      renderWidget: () => (
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}>
          <StatsChart />
        </div>
      ),
    },
  ]

  return (
    <div style={{
      position: 'relative',
      overflowX: 'hidden',
      paddingBottom: '100px',
    }}>
      <TopographicBackground isDark={isDarkMode} />

      {/* Theme Toggle Button */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="theme-toggle"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          color: 'var(--text-main)',
          transition: 'transform 0.2s ease'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Alternar tema"
        aria-label={isDarkMode ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      >
        {isDarkMode ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {/* Radial ambient glow behind hero title */}

      {/* Styles block for hover, animations and media queries */}
      <style>{`
        .theme-toggle {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 999;
          width: 50px;
          height: 50px;
        }
        @media (max-width: 640px) {
          .theme-toggle {
            width: 40px;
            height: 40px;
            bottom: 16px;
            right: 16px;
          }
        }
        .btn-primary {
          background: var(--accent-strong);
          color: #ffffff;
          border: none;
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }
        .btn-secondary {
          background: transparent;
          color: var(--text-main);
          border: 1px solid var(--card-border);
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-secondary:hover {
          background: var(--card-border);
          transform: translateY(-1px);
        }
        .editorial-container {
          display: flex;
          flex-direction: column;
        }
        .editorial-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(32px, 5vw, 64px);
          align-items: center;
          padding: clamp(48px, 6vw, 64px) 0;
          border-top: 1px solid var(--card-border);
        }
        .editorial-row:last-child {
          border-bottom: 1px solid var(--card-border);
        }
        .editorial-kicker {
          font-family: 'Geist Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: var(--accent-text);
          margin-bottom: 10px;
          display: block;
        }
        .editorial-title {
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 700;
          line-height: 1.25;
          letter-spacing: -0.8px;
          margin-bottom: 14px;
          color: var(--text-main);
        }
        .editorial-desc {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-muted);
          margin-bottom: 20px;
        }
        .spec-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .spec-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: var(--text-main);
          line-height: 1.45;
        }
        .spec-bullet {
          color: var(--accent-text);
          font-weight: 700;
          flex-shrink: 0;
          font-family: monospace;
        }
        .hero-title {
          font-family: 'Cx Mono', monospace;
          font-size: clamp(34px, 5.5vw, 68px);
          font-weight: 700;
          line-height: 1.15;
          letter-spacing: -1.5px;
          margin-bottom: 24px;
        }

        /* Floating Action Pill Bar */
        .hero-action-pill {
          display: inline-flex;
          align-items: center;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 100px;
          padding: 6px 8px 6px 20px;
          gap: 16px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
          margin-top: 6px;
          max-width: 100%;
        }
        .hero-action-step {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .hero-action-divider {
          width: 1px;
          height: 16px;
          background: var(--card-border);
        }
        .hero-action-btn {
          background: var(--accent-strong);
          color: #ffffff;
          border: none;
          padding: 10px 22px;
          border-radius: 100px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .hero-action-btn:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
        }

        /* 3 Fan-Out Tilted Cards (matching reference image) */
        .hero-cards-deck {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          position: relative;
          margin-top: clamp(40px, 5vw, 60px);
          padding: 10px 20px 40px;
          width: 100%;
          max-width: 1060px;
          perspective: 1000px;
        }
        .hero-card {
          flex: 0 1 320px;
          background: var(--card-bg);
          border: 1.5px solid var(--card-border);
          border-radius: 24px;
          padding: 28px 24px 20px;
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          min-height: 360px;
          cursor: pointer;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease, border-color 0.2s ease;
          user-select: none;
          position: relative;
        }
        [data-theme='light'] .hero-card {
          background: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 14px 0 -2px #0f172a, 0 20px 25px -5px rgba(15, 23, 42, 0.12);
        }
        [data-theme='dark'] .hero-card {
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 14px 0 -2px #000000, 0 24px 35px rgba(0, 0, 0, 0.65);
        }

        .hero-card-img {
          width: 100%;
          max-height: 175px;
          object-fit: contain;
          mix-blend-mode: multiply;
          pointer-events: none;
          user-select: none;
          transition: transform 0.3s ease;
        }
        [data-theme='dark'] .hero-card-img {
          filter: invert(1);
          mix-blend-mode: screen;
        }

        .hero-card-left {
          transform: rotate(-4deg) translateY(12px);
          margin-right: -24px;
          z-index: 1;
        }
        .hero-card-center {
          transform: rotate(0deg) translateY(-10px);
          z-index: 3;
        }
        .hero-card-right {
          transform: rotate(4deg) translateY(12px);
          margin-left: -24px;
          z-index: 2;
        }

        .hero-card:hover {
          transform: translateY(-20px) rotate(0deg) scale(1.03) !important;
          z-index: 10 !important;
          border-color: var(--accent) !important;
        }
        [data-theme='light'] .hero-card:hover {
          box-shadow: 0 20px 0 -2px var(--accent-strong), 0 30px 40px rgba(239, 68, 68, 0.2);
        }
        [data-theme='dark'] .hero-card:hover {
          box-shadow: 0 20px 0 -2px var(--accent-strong), 0 30px 40px rgba(0, 0, 0, 0.85);
        }

        .hero-card-kicker {
          font-family: 'Geist Mono', monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 8px;
          text-align: center;
        }

        .gallery-slide-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(32px, 5vw, 56px);
          align-items: center;
          min-height: 360px;
        }
        @media (max-width: 860px) {
          .gallery-slide-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }
        .hero-card-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.3;
          text-align: center;
          margin-bottom: 10px;
        }
        .hero-card-desc {
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.5;
          text-align: center;
          margin-bottom: 14px;
        }
        .hero-card-illustration {
          margin-top: auto;
          display: flex;
          align-items: center;
          justifyContent: center;
          width: 100%;
        }

        @media (max-width: 860px) {
          .editorial-row {
            grid-template-columns: 1fr;
            gap: 28px;
            padding: 36px 0;
          }
          .editorial-row.reverse-mobile {
            display: flex;
            flex-direction: column-reverse;
          }
          .hero-title { font-size: clamp(26px, 7vw, 44px) !important; letter-spacing: -1px; }
          .hero-nav-links { display: none !important; }
          .hero-cards-deck {
            flex-direction: column;
            align-items: center;
            gap: 24px;
            margin-top: 32px;
            padding-bottom: 10px;
          }
          .hero-card {
            width: 100%;
            max-width: 330px;
            margin: 0 !important;
            transform: none !important;
            min-height: 320px;
          }
          .hero-action-pill {
            flex-wrap: wrap;
            justify-content: center;
            border-radius: 18px;
            padding: 12px;
            gap: 10px;
          }
          .hero-action-divider {
            display: none;
          }
          .feature-tabs-bar {
            display: flex !important;
            overflow-x: auto;
            gap: 16px !important;
            padding-bottom: 4px;
            scrollbar-width: none;
          }
          .feature-tabs-bar::-webkit-scrollbar {
            display: none;
          }
          .feature-tabs-bar > button {
            min-width: 180px;
            flex-shrink: 0;
          }
        }
        `}</style>

      {/* Hero Wrapper - Rediseñado según la referencia visual del usuario */}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', paddingBottom: '40px' }}>

        {/* Top Navbar */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px clamp(20px, 4vw, 50px)',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          position: 'relative',
          zIndex: 10,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src={isDarkMode ? '/logo1.png' : '/logo2.png'}
              alt="Analyzor"
              style={{ height: 'clamp(50px, 6.5vw, 70px)', width: 'auto' }}
            />
          </div>

          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
          }} className="hero-nav-links">
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-main)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Funcionalidades
            </button>
            <button
              onClick={scrollToUploadZone}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-main)'}
              onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Cargar CSV
            </button>
            {datasets.length > 0 && (
              <button
                onClick={() => {
                  const el = document.getElementById('datasets-section')
                  el?.scrollIntoView({ behavior: 'smooth' })
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-main)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                Mis Datasets ({datasets.length})
              </button>
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
                transition: 'all 0.2s ease',
              }}
              aria-label="Cambiar tema de color"
            >
              {isDarkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              onClick={handleSample}
              disabled={uploading}
              style={{
                padding: '10px 24px',
                borderRadius: '100px',
                border: 'none',
                background: 'var(--accent-strong)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--accent-hover)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--accent-strong)'
                e.currentTarget.style.transform = 'none'
              }}
            >
              Probar Demo
            </button>
          </div>
        </header>

        {/* Glow behind content */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(900px, 80vw)',
          height: 'min(600px, 50vh)',
          background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.40) 0%, rgba(239, 68, 68, 0.10) 50%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        {/* Hero Content (Headline, Subtitle, Action Pill, 3 Cards) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 10,
          padding: '20px 20px 0',
        }}>
          <h1 className="hero-title" style={{ textAlign: 'center', position: 'relative', zIndex: 1, marginBottom: '20px' }}>
            Habla con tus datos.<br />
            <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Construye inteligencia.</span>
          </h1>

          {/* 3 Fan-Out Tilted Cards (Exact replication from reference photo) */}
          <div className="hero-cards-deck">
          {/* Card 1: Left (Tilted -4deg) */}
          <div
            className="hero-card hero-card-left"
            onClick={scrollToUploadZone}
            role="button"
            tabIndex={0}
          >
            <div>
              <div className="hero-card-kicker">SOLO NECESITAS UNA APP</div>
              <h3 className="hero-card-title">Pregunta como hablas, en cualquier momento</h3>
              <p className="hero-card-desc">Consultas en lenguaje cotidiano traducidas a SQL exacto y gráficos interactivos.</p>
            </div>
            <div className="hero-card-illustration">
              <img
                src="/hero-card-1.jpg"
                alt="Consultas en lenguaje natural con gráficos automáticos"
                className="hero-card-img"
              />
            </div>
          </div>

          {/* Card 2: Center (Upright, elevated, z-index 3) */}
          <div
            className="hero-card hero-card-center"
            onClick={handleSample}
            role="button"
            tabIndex={0}
          >
            <div>
              <div className="hero-card-kicker">100% EN TU NAVEGADOR</div>
              <h3 className="hero-card-title">Tus datos nunca salen de tu equipo</h3>
              <p className="hero-card-desc">Motor columnar DuckDB-WASM ejecutándose en tu propia RAM con aislamiento absoluto.</p>
            </div>
            <div className="hero-card-illustration">
              <img
                src="/hero-card-2.jpg"
                alt="Privacidad local con DuckDB en el navegador"
                className="hero-card-img"
              />
            </div>
          </div>

          {/* Card 3: Right (Tilted +4deg) */}
          <div
            className="hero-card hero-card-right"
            onClick={() => {
              const el = document.getElementById('features')
              el?.scrollIntoView({ behavior: 'smooth' })
            }}
            role="button"
            tabIndex={0}
          >
            <div>
              <div className="hero-card-kicker">INFORMES EN 1 CLIC</div>
              <h3 className="hero-card-title">Detecta anomalías y genera reportes PDF</h3>
              <p className="hero-card-desc">Auditoría automática de calidad de datos, correlaciones clave y reportes ejecutivos listos.</p>
            </div>
            <div className="hero-card-illustration">
              <img
                src="/hero-card-3.jpg"
                alt="Auditoría automática de datos y reportes PDF"
                className="hero-card-img"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Ingestion Section */}
    <section id="upload-section" style={{
      maxWidth: '1000px',
      margin: '20px auto 60px',
      padding: '0 20px',
      position: 'relative',
      zIndex: 1,
    }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
        }}>
          <span style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            fontWeight: 700,
            letterSpacing: '1.5px',
            color: 'var(--accent-text)',
            display: 'inline-block',
            marginBottom: '6px',
          }}>
              // INGESTA INMEDIATA
          </span>
          <h2 style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 700,
            letterSpacing: '-1px',
            color: 'var(--text-main)',
            margin: '0 0 24px 0',
          }}>
            Carga tu dataset y comienza en segundos
          </h2>
        </div>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              triggerFileInput()
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Arrastra o selecciona un archivo CSV"
          style={{
            border: dragActive ? '2px solid var(--accent)' : '2px dashed var(--card-border)',
            borderRadius: '14px',
            padding: 'clamp(32px, 5vw, 48px) 24px',
            background: dragActive ? 'var(--accent-glow)' : 'var(--code-bg)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <input
            type="file"
            accept=".csv"
            onChange={handleChange}
            style={{ display: 'none' }}
            id="fileInput"
          />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.75">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 4px 0' }}>
                {file ? 'Archivo CSV preparado' : 'Arrastra tu archivo CSV aquí o haz clic para explorar'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {file ? `${file.name} (${(file.size / 1024).toFixed(1)} KB)` : 'Archivos delimitados por coma (.csv) con encabezados'}
              </p>
            </div>
          </div>
        </div>

{
  file && (
    <div style={{ marginTop: '20px', maxWidth: '480px', margin: '20px auto 0' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--accent-glow)',
        border: '1px solid var(--accent-glow)',
        borderRadius: '8px',
        padding: '10px 14px',
        marginBottom: '15px',
      }}>
        <span style={{ fontSize: '13px', color: 'var(--text-main)' }}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
        <button
          onClick={(e) => { e.stopPropagation(); setFile(null); }}
          aria-label="Quitar archivo seleccionado"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', display: 'flex' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <button
        className="btn-primary"
        onClick={(e) => { e.stopPropagation(); handleUpload(); }}
        disabled={uploading}
        style={{ width: '100%', padding: '14px', fontSize: '15px' }}
      >
        {uploading ? 'Procesando y Analizando...' : 'Comenzar Análisis Inteligente →'}
      </button>
    </div>
  )
}

{
  !file && (
    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '16px', textAlign: 'center' }}>
      ¿No tienes un CSV a la mano?{' '}
      <button
        onClick={handleSample}
        disabled={uploading}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent-text)',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '13px',
          padding: 0,
          textDecoration: 'underline',
        }}
      >
        Prueba con datos de ejemplo (ecommerce_demo.csv)
      </button>
    </p>
  )
}

{
  error && (
    <p style={{ color: 'var(--accent-text)', fontSize: '13px', marginTop: '14px', textAlign: 'center' }}>{error}</p>
  )
}

<p style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  fontSize: '11px',
  color: 'var(--text-muted)',
  marginTop: '16px',
}}>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
  Tu archivo nunca sale de tu navegador. DuckDB-WASM procesa todo en local.
</p>
      </section >

      {/* Interactive Capabilities Gallery Showcase */}
      <section id="features" style={{
        maxWidth: '1060px',
        margin: '50px auto 90px',
        padding: '0 24px',
      }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <span className="editorial-kicker" style={{ textAlign: 'center', marginBottom: '8px' }}>
            // CAPACIDADES ANALÍTICAS
          </span>
          <h2 style={{
            fontSize: 'clamp(26px, 4vw, 36px)',
            fontWeight: 700,
            letterSpacing: '-1px',
            color: 'var(--text-main)',
            margin: '0 0 10px 0',
          }}>
            Todo tu análisis en una sola plataforma
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            maxWidth: '560px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Explora las tres capacidades centrales que convierten tus datos crudos en decisiones de negocio inmediatas.
          </p>
        </div>

        {/* Minimalist Editorial Tabs Navigation (No Bento-Box) */}
        <div className="feature-tabs-bar" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderBottom: '1px solid var(--card-border)',
          marginBottom: '40px',
          gap: '24px',
        }}>
          {FEATURE_SLIDES.map((slide, idx) => {
            const isActive = activeFeatureSlide === idx
            return (
              <button
                key={idx}
                onClick={() => setActiveFeatureSlide(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent-strong)' : '2px solid transparent',
                  paddingBottom: '16px',
                  marginBottom: '-1px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '8px',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.8px',
                  color: isActive ? 'var(--accent-text)' : 'var(--text-muted)',
                }}>
                  0{idx + 1}.
                </span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                  lineHeight: 1.35,
                }}>
                  {slide.tabLabel}
                </span>
              </button>
            )
          })}
        </div>

        {/* Slide Content: Open 2-Column Editorial Grid */}
        <div className="gallery-slide-grid">
          {/* Left Column: Details & Carousel Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="editorial-kicker" style={{ marginBottom: '10px' }}>
              {FEATURE_SLIDES[activeFeatureSlide].kicker}
            </span>
            <h3 style={{
              fontSize: 'clamp(24px, 3.2vw, 32px)',
              fontWeight: 700,
              lineHeight: 1.25,
              letterSpacing: '-0.6px',
              color: 'var(--text-main)',
              margin: '0 0 16px 0',
            }}>
              {FEATURE_SLIDES[activeFeatureSlide].title}
            </h3>

            <div className="spec-list" style={{ marginBottom: '28px' }}>
              {FEATURE_SLIDES[activeFeatureSlide].bullets.map((b, i) => (
                <div key={i} className="spec-item">
                  <span className="spec-bullet">✓</span>
                  <span><strong>{b.label}</strong> {b.text}</span>
                </div>
              ))}
            </div>

            {/* Carousel Controls & Counter (Geist Mono numbers) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              paddingTop: '20px',
              borderTop: '1px solid var(--card-border)',
            }}>
              <span style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '1px',
              }}>
                0{activeFeatureSlide + 1} / 0{FEATURE_SLIDES.length}
              </span>

              <div style={{ display: 'flex', gap: '6px' }}>
                {FEATURE_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveFeatureSlide(idx)}
                    aria-label={`Ir a la capacidad 0${idx + 1}`}
                    style={{
                      width: activeFeatureSlide === idx ? '22px' : '8px',
                      height: '4px',
                      borderRadius: '2px',
                      background: activeFeatureSlide === idx ? 'var(--accent-strong)' : 'var(--card-border)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.25s ease',
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button
                  onClick={() => setActiveFeatureSlide((prev) => (prev > 0 ? prev - 1 : FEATURE_SLIDES.length - 1))}
                  aria-label="Anterior"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: '1px solid var(--card-border)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-strong)'
                    e.currentTarget.style.color = 'var(--accent-strong)'
                    e.currentTarget.style.transform = 'translateX(-2px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                    e.currentTarget.style.color = 'var(--text-main)'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => setActiveFeatureSlide((prev) => (prev < FEATURE_SLIDES.length - 1 ? prev + 1 : 0))}
                  aria-label="Siguiente"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    border: '1px solid var(--card-border)',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-strong)'
                    e.currentTarget.style.color = 'var(--accent-strong)'
                    e.currentTarget.style.transform = 'translateX(2px)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--card-border)'
                    e.currentTarget.style.color = 'var(--text-main)'
                    e.currentTarget.style.transform = 'none'
                  }}
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Widget */}
          <div>
            {FEATURE_SLIDES[activeFeatureSlide].renderWidget()}
          </div>
        </div>
      </section>

  {/* MIS DATASETS */ }
{
  !datasetsLoading && (
    <section style={{
      maxWidth: '1000px',
      margin: '80px auto 0',
      padding: '0 20px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h2 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--text-main)',
        }}>
          Mis Datasets {datasets.length > 0 ? `(${datasets.length})` : ''}
        </h2>
        <button
          onClick={triggerFileInput}
          style={{
            padding: '8px 16px',
            background: 'var(--accent-strong)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Subir
        </button>
      </div>

      {datasets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '50px 20px',
          background: 'var(--card-bg)',
          borderRadius: '12px',
          border: '2px dashed var(--card-border)',
        }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: 'var(--text-main)' }}>
            No tienes datasets aún
          </p>
          <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
            Sube tu primer CSV desde la sección de carga o usando el botón de arriba
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px',
        }}>
          {datasets.map(ds => (
            <div
              key={ds.id}
              onClick={() => navigate(`/dashboard/${ds.id}`)}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '12px',
                padding: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.1)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--card-border)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'var(--accent)',
              }} />
              <h4 style={{
                margin: '6px 0 10px 0',
                fontSize: '15px',
                fontWeight: 700,
                color: 'var(--text-main)',
              }}>
                {ds.name}
              </h4>
              <div style={{
                display: 'flex',
                gap: '12px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '4px',
              }}>
                <span>{ds.rows_count?.toLocaleString() || 0} filas</span>
                <span>•</span>
                <span>{ds.columns?.length || 0} columnas</span>
              </div>
              <p style={{
                margin: '10px 0 0 0',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}>
                {new Date(ds.created_at).toLocaleDateString('es-ES', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!confirm('¿Eliminar este dataset?')) return
                  datasetsAPI.delete(ds.id).then(() => {
                    setDatasets(prev => prev.filter(d => d.id !== ds.id))
                  }).catch(console.error)
                }}
                aria-label={`Eliminar dataset ${ds.name}`}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--accent-glow)'
                  e.currentTarget.style.color = 'var(--accent-text)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
    </div >
  )
}
