const techStack = [
  { name: 'DUCKDB', desc: 'Base de datos SQL integrada' },
  { name: 'PANDAS', desc: 'Análisis y manipulación' },
  { name: 'DJANGO REST', desc: 'API robusta en backend' },
  { name: 'REACT', desc: 'Interfaz de usuario moderna' },
  { name: 'ZUSTAND', desc: 'Gestión de estado fluida' },
  { name: 'CELERY / REDIS', desc: 'Procesamiento en cola' },
  { name: 'WEASYPRINT', desc: 'Reportes premium en PDF' },
]

export default function TechTicker({ isDark }) {
  return (
    <>
      <style>{`
        @keyframes ticker {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
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
      `}</style>
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
    </>
  )
}
