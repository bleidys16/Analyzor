import { useEffect, useRef } from 'react'
import { BarChart, Bar, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const chartColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const pieColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#d946ef']

function ChartRenderer({ chartConfig }) {
  if (!chartConfig || chartConfig.type === 'text') return null

  const gridStroke = 'var(--card-border)'
  const axisStroke = 'var(--text-muted)'
  const tooltipBg = 'var(--card-bg)'
  const tooltipBorder = 'var(--card-border)'

  const commonProps = {
    margin: { top: 10, right: 10, bottom: 5, left: 0 },
  }

  switch (chartConfig.type) {
    case 'bar':
      return (
        <div style={{ width: '100%', height: '220px', marginTop: '12px' }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartConfig.data} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="name" stroke={axisStroke} fontSize={10} tickLine={false} />
              <YAxis stroke={axisStroke} fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ fontWeight: 600, color: 'var(--text-main)' }}
              />
              <Bar dataKey="value" fill={chartColors[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )

    case 'scatter':
      return (
        <div style={{ width: '100%', height: '220px', marginTop: '12px' }}>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="x" type="number" stroke={axisStroke} fontSize={10} tickLine={false} />
              <YAxis dataKey="y" type="number" stroke={axisStroke} fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ fontWeight: 600, color: 'var(--text-main)' }}
              />
              <Scatter name="Datos" data={chartConfig.data} fill={chartColors[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )

    case 'pie':
      return (
        <div style={{ width: '100%', height: '240px', marginTop: '12px' }}>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={chartConfig.data}
                cx="50%" cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
              >
                {chartConfig.data.map((_, i) => (
                  <Cell key={i} fill={pieColors[i % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ fontWeight: 600, color: 'var(--text-main)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
            {chartConfig.data.map((d, i) => (
              <span key={i} style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: pieColors[i % pieColors.length], display: 'inline-block' }} />
                {d.name}
              </span>
            ))}
          </div>
        </div>
      )

    case 'histogram':
      return (
        <div style={{ width: '100%', height: '220px', marginTop: '12px' }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartConfig.data} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="range" stroke={axisStroke} fontSize={10} tickLine={false} />
              <YAxis stroke={axisStroke} fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ fontWeight: 600, color: 'var(--text-main)' }}
              />
              <Bar dataKey="count" fill={chartColors[1]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )

    default:
      return null
  }
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: 'var(--text-muted)',
          animation: 'typing-bounce 1.4s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const AiIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 0 1 4 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 0 1 4-4z"/>
    <line x1="12" y1="14" x2="12" y2="20"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
)

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4"/>
    <path d="M20 21a8 8 0 0 0-16 0"/>
  </svg>
)

const SUGGESTIONS = [
  '¿Cuál es el promedio de los datos?',
  '¿Cuáles son los valores máximos y mínimos?',
  '¿Cómo se distribuyen los datos?',
  'Muéstrame un resumen general',
  '¿Hay alguna correlación entre columnas?',
  'Gráfico de torta por género',
]

export default function ChatMessages({ messages = [], sending = false, onSend }) {
  const validMessages = (messages || []).filter(msg => msg && msg.role)
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [messages, sending])

  if (validMessages.length === 0 && !sending) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        gap: '20px',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'var(--accent-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '15px', margin: '0 0 4px 0', fontWeight: 600 }}>
            ¿Qué quieres saber?
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, lineHeight: 1.5 }}>
            Pregúntale a la IA sobre tus datos o elige una sugerencia
          </p>
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          justifyContent: 'center',
          maxWidth: '400px',
        }}>
          {SUGGESTIONS.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => onSend?.(suggestion)}
              style={{
                padding: '8px 14px',
                background: 'var(--code-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: '20px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: '"Space Grotesk", sans-serif',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.borderColor = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--code-bg)'
                e.currentTarget.style.color = 'var(--text-muted)'
                e.currentTarget.style.borderColor = 'var(--card-border)'
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      flex: 1,
      overflowY: 'auto',
      paddingRight: '4px',
    }}>
      {validMessages.map((msg, idx) => (
        <div key={idx} style={{
          display: 'flex',
          flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          gap: '8px',
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            background: msg.role === 'user' ? 'var(--accent)' : 'var(--code-bg)',
            border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
          }}>
            {msg.role === 'user' ? <UserIcon /> : <AiIcon />}
          </div>
          <div style={{ maxWidth: '80%', minWidth: 0 }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--card-bg)',
              color: msg.role === 'user' ? 'white' : 'var(--text-main)',
              fontSize: '13px',
              lineHeight: '1.55',
              border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
              boxShadow: msg.role === 'user' ? '0 2px 8px rgba(239, 68, 68, 0.2)' : 'none',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'break-word',
            }}>
              {msg.content}
            </div>
            {msg.role === 'assistant' && msg.query_result?.chart && (
              <ChartRenderer chartConfig={msg.query_result.chart} />
            )}
          </div>
        </div>
      ))}
      {sending && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '36px' }}>
          <TypingDots />
        </div>
      )}
    </div>
  )
}
