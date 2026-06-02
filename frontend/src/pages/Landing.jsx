import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { datasetsAPI } from '../api/datasets'
import { useStore } from '../store/store'
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, ResponsiveContainer, Cell, XAxis, Tooltip } from 'recharts'
import TopographicBackground from '../components/TopographicBackground'

// Mock data for statistics distribution (donut chart)
const statsDistribution = [
  { name: 'Media', value: 35 },
  { name: 'Mediana', value: 28 },
  { name: 'Desviación Est.', value: 20 },
  { name: 'Percentil 95', value: 17 },
]

const techStack = [
  { name: 'DUCKDB', desc: 'Base de datos SQL integrada' },
  { name: 'PANDAS', desc: 'Análisis y manipulación' },
  { name: 'DJANGO REST', desc: 'API robusta en backend' },
  { name: 'REACT', desc: 'Interfaz de usuario moderna' },
  { name: 'ZUSTAND', desc: 'Gestión de estado fluida' },
  { name: 'CELERY / REDIS', desc: 'Procesamiento en cola' },
  { name: 'WEASYPRINT', desc: 'Reportes premium en PDF' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { sessionId } = useStore()
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [datasets, setDatasets] = useState([])
  const [datasetsLoading, setDatasetsLoading] = useState(true)

  // Theme state (Light is default)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Restore persisted theme
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      setIsDarkMode(true)
    }
  }, [])

  useEffect(() => {
    loadDatasets()
  }, [])

  const loadDatasets = async () => {
    try {
      const response = await datasetsAPI.getAll()
      const all = response.data || []
      const seen = new Map()
      for (const ds of all) {
        const key = `${ds.name}_${ds.created_at?.slice(0, 10) || ''}`
        if (!seen.has(key) || new Date(ds.created_at) > new Date(seen.get(key).created_at)) {
          seen.set(key, ds)
        }
      }
      setDatasets(Array.from(seen.values()))
    } catch (_) {
    } finally {
      setDatasetsLoading(false)
    }
  }

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

  const triggerFileInput = () => {
    document.getElementById('fileInput').click()
  }

  const scrollToUploadZone = () => {
    const el = document.getElementById('upload-section')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  // Chart Colors based on Theme
  const accentHex = '#ef4444' // Vibrant Red
  const chartBg = isDarkMode ? '#0d121f' : '#ffffff'
  const tooltipBorder = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  // Custom multi-color palette for the DuckDB bar chart
  const barColors = ['#ef4444', '#f43f5e', '#fb7185', '#fda4af']

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
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          zIndex: 999,
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
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
      >
        {isDarkMode ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>

      {/* Radial ambient glow behind hero title */}

      {/* Styles block for hover, animations and media queries */}
      <style>{`
        @keyframes pulse-accent {
          0% { box-shadow: 0 0 0 0 var(--accent-glow); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes ticker {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .glow-bullet {
          animation: pulse-accent 2s infinite;
        }
        .btn-primary {
          background: var(--accent);
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
        .feature-card {
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 16px;
          padding: 35px;
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          border-color: var(--accent-glow);
          transform: translateY(-2px);
        }
        .ticker-wrap {
          width: 100%;
          overflow: hidden;
          background: transparent;
          padding: 30px 0;
          position: relative;
          margin: 40px 0 80px;
        }
        .ticker-wrap::before, .ticker-wrap::after {
          content: "";
          position: absolute;
          top: 0;
          width: 150px;
          height: 100%;
          z-index: 2;
          pointer-events: none;
        }
        .ticker-wrap::before {
          left: 0;
          background: linear-gradient(to right, var(--bg-color) 0%, transparent 100%);
        }
        .ticker-wrap::after {
          right: 0;
          background: linear-gradient(to left, var(--bg-color) 0%, transparent 100%);
        }
        .ticker {
          display: inline-flex;
          white-space: nowrap;
          animation: ticker 30s linear infinite;
        }
        .ticker-item {
          margin: 0 50px;
          font-size: 14px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 2px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: color 0.2s ease;
        }
        .ticker-item:hover {
          color: var(--accent);
        }

        /* RESPONSIVE DESIGN GRIDS */
        .grid-2 {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 20px;
        }
        .grid-12 {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }
        .grid-12 .col-7 {
          grid-column: span 7;
        }
        .grid-12 .col-5 {
          grid-column: span 5;
        }
        .grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
          .hero-title {
            font-size: clamp(32px, 6vw, 72px);
            font-weight: 700;
            line-height: 1.05;
            letter-spacing: -2.5px;
            margin-bottom: 20px;
          }
          
          @media (max-width: 900px) {
            .grid-2 { grid-template-columns: 1fr; }
            .grid-12 { grid-template-columns: 1fr; }
            .grid-12 .col-7 { grid-column: span 1; }
            .grid-12 .col-5 { grid-column: span 1; }
            .grid-3 { grid-template-columns: 1fr; }
            .hero-title { font-size: clamp(24px, 7vw, 48px) !important; letter-spacing: -1px; }
          }
        `}</style>

        {/* Hero Wrapper - exactly fills the viewport */}
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

          {/* Centered Premium Branding Header */}
          <header style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            position: 'relative',
            zIndex: 10,
            flexShrink: 0,
          }}>
            <img
              src={isDarkMode ? '/logo1.png' : '/logo2.png'}
              alt="Analyzor"
              style={{ height: 'clamp(64px, 8vw, 110px)', width: 'auto' }}
            />
          </header>

          {/* Glow behind content - centered on viewport */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(900px, 80vw)',
            height: 'min(700px, 60vh)',
            background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.50) 0%, rgba(239, 68, 68, 0.15) 50%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }} />

          {/* Center content */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            zIndex: 10,
            padding: '0 20px',
            marginTop: 'clamp(-20px, -3vh, -40px)',
          }}>

            <h1 className="hero-title" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              Habla con tus datos.<br />
              <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--text-muted)' }}>Construye inteligencia.</span>
            </h1>

            <p style={{
              fontSize: 'clamp(14px, 2vw, 18px)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              maxWidth: '680px',
              margin: '0 auto clamp(20px, 3vh, 40px)',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}>
              Consultas SQL, perfilado automático y análisis estadístico avanzado impulsado por IA.
            </p>

            <div style={{ display: 'flex', gap: 'clamp(10px, 2vw, 15px)', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
              <button className="btn-primary" onClick={scrollToUploadZone}>
                Cargar un CSV Gratis
              </button>
              <button className="btn-secondary" onClick={() => {
                const el = document.getElementById('features')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}>
                Ver Funcionalidades
              </button>
            </div>
          </div>
        </div>

        {/* Tech Ticker - appears on first scroll */}
        <section style={{
          maxWidth: '1000px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '80px 20px 40px',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2.5px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '10px' }}>
            TECNOLOGÍAS DE ALTO RENDIMIENTO QUE INTEGRAN NUESTRO STACK
          </p>

          <div className="ticker-wrap">
            <div className="ticker">
              {[...techStack, ...techStack].map((tech, i) => (
                <div key={i} className="ticker-item">
                  <span style={{ color: 'var(--text-main)' }}>{tech.name}</span>
                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 400 }}>{tech.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
      <section id="features" style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '0 20px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <div style={{
            display: 'inline-flex',
            background: 'var(--accent-glow)',
            border: '1px solid var(--accent-glow)',
            borderRadius: '100px',
            padding: '4px 12px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', letterSpacing: '1px' }}>FUNCIONALIDADES</span>
          </div>
        </div>

        <h2 style={{
          fontSize: '44px',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '50px',
          letterSpacing: '-1.5px',
          color: 'var(--text-main)'
        }}>
          Todo lo que un analista serio necesita. <span style={{ color: 'var(--text-muted)' }}>Sin complicaciones.</span>
        </h2>

        <div className="grid-12">
          {/* CARD 1: CSV INGEST */}
          <div id="upload-section" className="feature-card col-7" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', marginBottom: '15px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>CSV INGEST</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Carga rápida de CSV</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, maxWidth: '420px' }}>
                Sube cualquier archivo. Nuestro motor limpia datos, infiere columnas y optimiza el dataset con DuckDB al instante.
              </p>
            </div>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              style={{
                border: dragActive ? '2px solid var(--accent)' : '1px dashed var(--card-border)',
                borderRadius: '12px',
                padding: '30px',
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

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 2px 0' }}>
                    {file ? '¡CSV Listo!' : 'Arrastra tu archivo CSV aquí'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    {file ? file.name : 'o haz clic para explorar en tu equipo'}
                  </p>
                </div>
              </div>
            </div>

            {file && (
              <div style={{ marginTop: '20px' }}>
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
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>✕</button>
                </div>
                <button
                  className="btn-primary"
                  onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                  disabled={uploading}
                  style={{ width: '100%', padding: '12px' }}
                >
                  {uploading ? 'Procesando y Analizando...' : 'Comenzar Análisis Inteligente →'}
                </button>
              </div>
            )}

            {error && (
              <p style={{ color: 'var(--accent)', fontSize: '12px', marginTop: '12px', textAlign: 'center' }}>{error}</p>
            )}
          </div>

          {/* CARD 2: CHAT */}
          <div className="feature-card col-5" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', marginBottom: '15px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a9 9 0 0 1-9 9m-9-9a9 9 0 0 1 9-9" />
                  <path d="M21 3L3 21" />
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>CHATEA CON TUS DATOS</span>
              </div>
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Consulta en lenguaje natural</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Haz preguntas claras. La IA generará el SQL exacto, extraerá insights y mostrará el gráfico ideal para tus datos.
              </p>
            </div>

            <div style={{ marginTop: '25px', background: 'var(--code-bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--card-border)' }}>
              <div style={{ background: 'var(--card-bg)', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', display: 'inline-block', border: '1px solid var(--card-border)' }}>
                "Suma los ingresos totales por categoría en 2026..."
              </div>
              <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-glow)', borderRadius: '8px', padding: '12px', fontFamily: 'monospace', fontSize: '11px' }}>
                <span style={{ color: '#ec4899' }}>SELECT</span> categoria, <span style={{ color: '#3b82f6' }}>SUM</span>(ingresos)<br />
                <span style={{ color: '#ec4899' }}>FROM</span> dataset <span style={{ color: '#ec4899' }}>WHERE</span> fecha &gt;= <span style={{ color: 'var(--accent)' }}>'2026-01-01'</span><br />
                <span style={{ color: '#ec4899' }}>GROUP BY</span> categoria <span style={{ color: '#ec4899' }}>ORDER BY</span> 2 <span style={{ color: '#ec4899' }}>DESC</span>;
              </div>
            </div>
          </div>
        </div>

        <div className="grid-3">
          {/* CARD 1: Perfilado Estadístico + Donut de estadísticas */}
          <div className="feature-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '25px 25px 0 25px' }}>
              <div style={{ marginBottom: '12px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Perfilado Estadístico</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
                Calcula automáticamente calidad de datos, estadísticas descriptivas, correlaciones y anomalías al instante.
              </p>
            </div>
            <div style={{
              marginTop: 'auto',
              padding: '12px 10px 10px',
              borderTop: '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}>
              <div style={{ width: '110px', height: '110px', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie
                      data={statsDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={50}
                      paddingAngle={3}
                    >
                      {statsDistribution.map((_, index) => (
                        <Cell key={index} fill={barColors[index % barColors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {statsDistribution.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '2px',
                      background: barColors[i % barColors.length], flexShrink: 0,
                    }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</span>
                    <span>{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CARD 2: Editor SQL Integrado */}
          <div className="feature-card" style={{ padding: '25px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '12px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Editor SQL Integrado</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px', flex: 1 }}>
              Escribe comandos SQL directos sobre tus datos indexados con DuckDB a alta velocidad.
            </p>
            <div style={{
              background: 'var(--code-bg)',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '11px',
              border: '1px solid var(--card-border)',
            }}>
              <span style={{ color: '#ec4899' }}>SELECT</span> categoria, <span style={{ color: '#3b82f6' }}>SUM</span>(ingresos)<br />
              <span style={{ color: '#ec4899' }}>FROM</span> dataset <span style={{ color: '#ec4899' }}>GROUP BY</span> categoria<br />
              <span style={{ color: '#ec4899' }}>ORDER BY</span> 2 <span style={{ color: '#ec4899' }}>DESC</span>;
            </div>
          </div>

          {/* CARD 3: Reportes y Exportación */}
          <div className="feature-card" style={{ padding: '25px' }}>
            <div style={{ marginBottom: '15px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Reportes y Exportación</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>Genera reportes PDF ejecutivos de tus análisis o descarga resultados en CSV al instante.</p>
          </div>
        </div>
      </section>

      {/* MIS DATASETS */}
      {!datasetsLoading && (
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
                background: 'var(--accent)',
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
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
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
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: 'var(--text-muted)',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'var(--accent-glow)'
                      e.currentTarget.style.color = 'var(--accent)'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
