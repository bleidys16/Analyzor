import { PieChart, Pie, ResponsiveContainer, Cell } from 'recharts'

const statsDistribution = [
  { name: 'Media', value: 35 },
  { name: 'Mediana', value: 28 },
  { name: 'Desviación Est.', value: 20 },
  { name: 'Percentil 95', value: 17 },
]

const barColors = ['#e11d48', '#f43f5e', '#fb7185', '#fda4af']

export default function StatsChart() {
  return (
    <div style={{
      background: 'var(--code-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: '12px',
        borderBottom: '1px solid var(--card-border)',
      }}>
        <span style={{
          fontSize: '11px',
          fontFamily: 'monospace',
          fontWeight: 700,
          letterSpacing: '1px',
          color: 'var(--accent-text)',
        }}>
          SALUD DE TUS DATOS
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          DuckDB Local
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div style={{
          padding: '10px 8px',
          background: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>CALIDAD</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>99.8%</div>
        </div>
        <div style={{
          padding: '10px 8px',
          background: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>TENDENCIA</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>r = 0.84</div>
        </div>
        <div style={{
          padding: '10px 8px',
          background: 'var(--card-bg)',
          borderRadius: '8px',
          border: '1px solid var(--card-border)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>ANOMALÍAS</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>0 críticas</div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '6px 0',
      }}>
        <div style={{ width: '100px', height: '100px', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie
                data={statsDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={48}
                paddingAngle={3}
              >
                {statsDistribution.map((_, index) => (
                  <Cell key={index} fill={barColors[index % barColors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {statsDistribution.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
              <span style={{
                width: '8px', height: '8px', borderRadius: '2px',
                background: barColors[i % barColors.length], flexShrink: 0,
              }} />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{item.value}%</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '6px',
        fontSize: '11px',
      }}>
        <span style={{ color: 'var(--text-muted)' }}>Informe listo</span>
        <span style={{ fontWeight: 600, color: 'var(--accent-text)', fontFamily: 'monospace' }}>PDF en 1 Clic</span>
      </div>
    </div>
  )
}

