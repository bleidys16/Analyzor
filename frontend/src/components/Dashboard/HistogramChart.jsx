import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']

function CustomTooltip({ active, payload, label, stats }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0f172a', color: '#fff', padding: '10px 14px',
      borderRadius: '8px', fontSize: '12px', lineHeight: 1.6,
    }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{label}</p>
      <p style={{ margin: 0, opacity: 0.8 }}>{payload[0].value} registros</p>
      {stats && (
        <>
          <p style={{ margin: '8px 0 0 0', borderTop: '1px solid #334155', paddingTop: '6px', opacity: 0.7 }}>
            Media: {stats.mean.toFixed(2)} | Mediana: {stats.median.toFixed(2)}
          </p>
          <p style={{ margin: 0, opacity: 0.7 }}>
            Min: {stats.min.toFixed(1)} | Max: {stats.max.toFixed(1)}
          </p>
        </>
      )}
    </div>
  )
}

export default function HistogramChart({ data }) {
  if (!data?.bins?.length) {
    return <EmptyState />
  }

  return (
    <div>
      <div style={{
        display: 'flex', gap: '16px', marginBottom: '14px', flexWrap: 'wrap',
      }}>
        <StatBadge label="Media" value={data.stats.mean.toFixed(1)} />
        <StatBadge label="Mediana" value={data.stats.median.toFixed(1)} />
        <StatBadge label="Min" value={data.stats.min.toFixed(1)} />
        <StatBadge label="Max" value={data.stats.max.toFixed(1)} />
        <StatBadge label="Std" value={data.stats.std.toFixed(2)} />
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data.bins} margin={{ top: 0, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip stats={data.stats} />} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={35}>
            {data.bins.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function StatBadge({ label, value }) {
  return (
    <div style={{ fontSize: '11px', color: '#64748b' }}>
      <span style={{ fontWeight: 700, color: '#0f172a', marginRight: '3px' }}>{value}</span>
      {label}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
      Sin datos suficientes
    </div>
  )
}
