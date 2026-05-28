import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'

const COLORS = ['#3b82f6', '#60a5fa', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: '#0f172a', color: '#fff', padding: '8px 12px',
      borderRadius: '6px', fontSize: '12px',
    }}>
      <p style={{ margin: 0, fontWeight: 700 }}>{d.label}</p>
      <p style={{ margin: '4px 0 0 0', opacity: 0.8 }}>{d.count} registros ({d.pct}%)</p>
    </div>
  )
}

function BarView({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          dataKey="label"
          type="category"
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function PieView({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <ResponsiveContainer width="60%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="count"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ flex: 1, fontSize: '11px' }}>
        {data.map((d, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: COLORS[i % COLORS.length], display: 'inline-block',
            }} />
            <span style={{ color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.label}
            </span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CategoryChart({ data }) {
  if (!data?.values?.length) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
        Sin datos
      </div>
    )
  }

  return data.chart === 'pie' ? <PieView data={data.values} /> : <BarView data={data.values} />
}
