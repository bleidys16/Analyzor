import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { datasetsAPI } from '../api/datasets'
import { useStore } from '../store/store'
import { AreaChart, Area, BarChart, Bar, ResponsiveContainer, Cell, XAxis, Tooltip } from 'recharts'

// Mock data for ML Model training accuracy curve
const mlTrainingData = [
  { name: 'E1', precision: 0.52 },
  { name: 'E2', precision: 0.65 },
  { name: 'E3', precision: 0.73 },
  { name: 'E4', precision: 0.79 },
  { name: 'E5', precision: 0.84 },
  { name: 'E6', precision: 0.88 },
  { name: 'E7', precision: 0.91 },
  { name: 'E8', precision: 0.93 },
  { name: 'E9', precision: 0.95 },
  { name: 'E10', precision: 0.96 },
]

// Mock data for DuckDB SQL Query result (Sales by category)
const sqlQueryResult = [
  { name: 'Tecnología', ventas: 84000 },
  { name: 'Muebles', ventas: 59000 },
  { name: 'Oficina', ventas: 32000 },
  { name: 'Moda', ventas: 45000 },
]

const techStack = [
  { name: 'DUCKDB', desc: 'Base de datos SQL integrada' },
  { name: 'SCIKIT-LEARN', desc: 'Modelado predictivo ML' },
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
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
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
      setError(err.response?.data?.detail || 'Error al procesar el archivo CSV')
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

      {/* Radial ambient glow in background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '1200px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.35) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

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
          font-size: 72px;
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
          .hero-title { font-size: 48px; letter-spacing: -1px; }
        }
      `}</style>

      {/* Centered Premium Branding Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px 20px',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-main)' }}>
          ANALYZOR<span style={{ color: 'var(--accent)' }}>.</span>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: '850px',
        margin: '60px auto 40px',
        textAlign: 'center',
        padding: '0 20px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Release Capsule */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent-glow)',
          borderRadius: '100px',
          padding: '6px 14px',
          marginBottom: '30px',
        }}>
          <span className="glow-bullet" style={{
            width: '6px',
            height: '6px',
            background: 'var(--accent)',
            borderRadius: '50%',
          }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.5px' }}>
            V1.0 - ANALÍTICA INTELIGENTE CON IA Y SQL
          </span>
        </div>

        {/* Heading */}
        <h1 className="hero-title">
          Habla con tus datos.<br />
          <span style={{ fontStyle: 'italic', fontWeight: 300, color: 'var(--text-muted)' }}>Construye inteligencia.</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '18px',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          maxWidth: '680px',
          margin: '0 auto 40px',
        }}>
          Consultas SQL, modelos predictivos y análisis avanzados desde una interfaz impulsada por IA.
        </p>

        {/* Hero CTAs */}
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
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
      </section>

      {/* Interactive Mock Dashboard Panel */}
      <section style={{
        maxWidth: '1000px',
        margin: '60px auto 100px',
        padding: '0 20px',
        position: 'relative',
        zIndex: 10,
      }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: isDarkMode ? '0 30px 60px -15px rgba(0,0,0,0.8)' : '0 30px 60px -15px rgba(0,0,0,0.1)',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--card-border)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px', fontFamily: 'monospace' }}>analyzor.app / sandbox / analytics_visualization</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', background: 'var(--accent)', borderRadius: '50%' }} />
              <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>DEMOSTRACIÓN</span>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid-2">

            {/* ML Training Accuracy Area Chart */}
            <div style={{ background: 'var(--chart-bg)', borderRadius: '12px', padding: '20px', height: '260px', position: 'relative', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Precisión de Entrenamiento ML (Random Forest)</h3>
                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>Acc: 96.4%</span>
              </div>
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mlTrainingData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: chartBg, borderColor: tooltipBorder, borderRadius: '6px', color: 'var(--text-main)' }} 
                      itemStyle={{ color: 'var(--text-main)' }}
                      labelStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                    />
                    <defs>
                      <linearGradient id="colorAccuracy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accentHex} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={accentHex} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="precision" name="Precisión" stroke={accentHex} strokeWidth={2} fillOpacity={1} fill="url(#colorAccuracy)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SQL Query Bar Chart */}
            <div style={{ background: 'var(--chart-bg)', borderRadius: '12px', padding: '20px', height: '260px', border: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Consulta SQL: Ventas por Categoría</h3>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>LIMIT 4</span>
              </div>
              <div style={{ width: '100%', height: '180px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sqlQueryResult} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: chartBg, borderColor: tooltipBorder, borderRadius: '6px', color: 'var(--text-main)' }} 
                      itemStyle={{ color: 'var(--text-main)' }}
                      labelStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                    />
                    <Bar dataKey="ventas" name="Ventas ($)" radius={[4, 4, 0, 0]}>
                      {sqlQueryResult.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Infinite Technology Ticker Carousel */}
      <section style={{
        maxWidth: '1000px',
        margin: '0 auto 80px',
        textAlign: 'center',
        padding: '0 20px',
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
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Carga de CSV sin configuraciones</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, maxWidth: '420px' }}>
                Arrastra cualquier hoja de cálculo. Nuestro motor limpia los datos en backend, infiere los tipos de columnas y optimiza el dataset relacional con DuckDB al instante.
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
              <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>Pregunta en lenguaje natural</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
                Haz preguntas a tu base de datos tal como las piensas. La IA generará la consulta SQL exacta, extraerá los insights y renderizará el gráfico ideal.
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
          {[
            {
              title: 'Modelos ML Integrados',
              desc: 'Entrena algoritmos de Machine Learning (regresión y clasificación) basados en las columnas de tu CSV con métricas automatizadas en segundos.',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              )
            },
            {
              title: 'Editor SQL Relacional',
              desc: 'Disfruta de la potencia analítica relacional pura escribiendo comandos SQL directos sobre tus datos indexados con DuckDB de alta velocidad.',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              )
            },
            {
              title: 'Exportación en 1 clic',
              desc: 'Genera reportes PDF ejecutivos de tus análisis clave o descarga cualquier resultado de consultas a archivos CSV instantáneamente.',
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )
            }
          ].map((card, i) => (
            <div key={i} className="feature-card" style={{ padding: '25px' }}>
              <div style={{ marginBottom: '15px' }}>{card.icon}</div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{card.title}</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
