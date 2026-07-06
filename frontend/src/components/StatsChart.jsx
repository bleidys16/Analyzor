import { PieChart, Pie, ResponsiveContainer, Cell } from 'recharts'

const statsDistribution = [
  { name: 'Media', value: 35 },
  { name: 'Mediana', value: 28 },
  { name: 'Desviación Est.', value: 20 },
  { name: 'Percentil 95', value: 17 },
]

const barColors = ['#ef4444', '#f43f5e', '#fb7185', '#fda4af']

export default function StatsChart({ isDark }) {
  return (
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
  )
}
