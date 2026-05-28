import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: '#0f172a', color: '#fff', padding: '8px 12px',
      borderRadius: '6px', fontSize: '12px',
    }}>
      <p style={{ margin: 0 }}>{d.x_label || 'X'}: <strong>{d.x?.toFixed(2)}</strong></p>
      <p style={{ margin: '4px 0 0 0' }}>{d.y_label || 'Y'}: <strong>{d.y?.toFixed(2)}</strong></p>
    </div>
  )
}

export default function ScatterPlotView({ data }) {
  if (!data?.points?.length) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
        No hay suficientes datos numéricos
      </div>
    )
  }

  const points = data.points.map(p => ({
    ...p,
    x_label: data.x_label,
    y_label: data.y_label,
  }))

  return (
    <div>
      <div style={{
        fontSize: '11px', color: '#64748b', marginBottom: '12px',
      }}>
        <strong style={{ color: '#0f172a' }}>{data.x_label}</strong> vs{' '}
        <strong style={{ color: '#0f172a' }}>{data.y_label}</strong>
        {' '}· {points.length} puntos
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            label={{ value: data.x_label, position: 'bottom', fontSize: 10, fill: '#64748b', offset: -2 }}
          />
          <YAxis
            dataKey="y"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            label={{ value: data.y_label, angle: -90, position: 'left', fontSize: 10, fill: '#64748b', offset: 0 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter data={points} fill="#3b82f6" opacity={0.6} r={4} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
