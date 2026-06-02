import { BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const chartColors = ['#ef4444', '#f43f5e', '#fb7185', '#fda4af']

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

export default function ChatMessages({ messages = [], sending = false }) {
  const validMessages = (messages || []).filter(msg => msg && msg.role)

  if (validMessages.length === 0 && !sending) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        gap: '16px',
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'var(--accent-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          Pregúntale a la IA sobre tus datos
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '240px' }}>
          {['¿Cuál es el promedio de ventas?', '¿Qué colores están correlacionados?', 'Muéstrame los outliers'].map((suggestion, i) => (
            <div key={i} style={{
              padding: '8px 12px',
              background: 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '8px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}>
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
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
          <div style={{
            maxWidth: '80%',
          }}>
            <div style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: msg.role === 'user' ? 'var(--accent)' : 'var(--card-bg)',
              color: msg.role === 'user' ? 'white' : 'var(--text-main)',
              fontSize: '13px',
              lineHeight: '1.55',
              border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
              boxShadow: msg.role === 'user' ? '0 2px 8px rgba(239, 68, 68, 0.2)' : 'none',
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
