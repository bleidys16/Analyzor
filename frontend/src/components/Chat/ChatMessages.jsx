import { BarChart, Bar, ScatterChart, Scatter, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function ChatMessages({ messages = [] }) {
  const renderChart = (chartConfig) => {
    if (!chartConfig || chartConfig.type === 'text') return null

    const containerStyle = {
      width: '100%',
      height: '250px',
      marginTop: '10px',
      marginBottom: '10px',
    }

    switch (chartConfig.type) {
      case 'bar':
        return (
          <div style={containerStyle}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartConfig.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      
      case 'scatter':
        return (
          <div style={containerStyle}>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="x" type="number" stroke="#64748b" fontSize={10} />
                <YAxis dataKey="y" type="number" stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                <Scatter name="Datos" data={chartConfig.data} fill="#ef4444" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )
      
      case 'histogram':
        return (
          <div style={containerStyle}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartConfig.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }} />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      
      default:
        return null
    }
  }

  const validMessages = (messages || []).filter(msg => msg && msg.role)

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      marginBottom: '15px',
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: '15px',
      minHeight: '300px',
    }}>
      {validMessages.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'center', marginTop: '50px' }}>
          Haz preguntas sobre tus datos
        </p>
      ) : (
        validMessages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: '15px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: msg.role === 'user' ? '#3b82f6' : '#f1f5f9',
                  color: msg.role === 'user' ? 'white' : '#1a1a1a',
                  fontSize: '12px',
                  lineHeight: '1.4',
                }}
              >
                {msg.content}
              </div>
            </div>
            
            {msg.role === 'assistant' && msg.query_result?.chart && (
              <div style={{ marginLeft: '0px' }}>
                {renderChart(msg.query_result.chart)}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}