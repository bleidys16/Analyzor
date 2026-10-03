import { useRef, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import { chartToPng, downloadBlob, slugify } from '../../utils/chartImage'

const chartColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const pieColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#d946ef']

const gridStroke = 'var(--card-border)'
const axisStroke = 'var(--text-muted)'
const tooltipProps = {
  contentStyle: { background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', fontSize: '12px' },
  labelStyle: { fontWeight: 600, color: 'var(--text-main)' },
}
const margin = { top: 10, right: 10, bottom: 5, left: 0 }
const axisProps = { stroke: axisStroke, fontSize: 10, tickLine: false }

const HEIGHT = { pie: 240 }

// Devuelve el gráfico de Recharts para cada tipo (función, no componente: ResponsiveContainer exige el gráfico como hijo directo)
function renderPlot({ type, data }) {
  switch (type) {
    case 'bar':
      return (
        <BarChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey="value" fill={chartColors[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      )
    case 'line':
      return (
        <LineChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="name" interval="preserveStartEnd" minTickGap={16} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipProps} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={chartColors[0]}
            strokeWidth={2}
            dot={data.length <= 40 ? { r: 3, fill: chartColors[0] } : false}
            isAnimationActive={false}
          />
        </LineChart>
      )
    case 'scatter':
      return (
        <ScatterChart margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="x" type="number" {...axisProps} />
          <YAxis dataKey="y" type="number" {...axisProps} />
          <Tooltip {...tooltipProps} />
          <Scatter name="Datos" data={data} fill={chartColors[0]} />
        </ScatterChart>
      )
    case 'pie':
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            // los sectores diminutos no llevan etiqueta: se amontonarían unas sobre otras
            label={({ percent }) => (percent >= 0.03 ? `${(percent * 100).toFixed(0)}%` : '')}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={pieColors[i % pieColors.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipProps} />
        </PieChart>
      )
    case 'histogram':
      return (
        <BarChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="range" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey="count" fill={chartColors[1]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      )
    default:
      return null
  }
}

export default function ChartRenderer({ chartConfig }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const plot = chartConfig && chartConfig.type !== 'text' ? renderPlot(chartConfig) : null
  if (!plot) return null

  const height = HEIGHT[chartConfig.type] ?? 220
  const legend = chartConfig.type === 'pie'
    ? chartConfig.data.map((d, i) => ({ name: d.name, color: pieColors[i % pieColors.length] }))
    : []

  const download = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await chartToPng(ref.current, { title: chartConfig.title, legend })
      downloadBlob(blob, `${slugify(chartConfig.title)}.png`)
    } catch (err) {
      console.warn('No se pudo descargar el gráfico:', err)
      setError('No se pudo descargar el gráfico')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{chartConfig.title}</span>
        <button
          onClick={download}
          disabled={busy}
          title="Descargar el gráfico como imagen PNG"
          style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: '6px', color: 'var(--text-muted)', cursor: busy ? 'wait' : 'pointer', fontSize: '11px', padding: '3px 8px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
        >
          {busy ? 'Generando…' : '⬇ PNG'}
        </button>
      </div>

      <div ref={ref} style={{ width: '100%', height: `${height}px` }}>
        <ResponsiveContainer width="100%" height={height}>
          {plot}
        </ResponsiveContainer>
      </div>

      {chartConfig.type === 'pie' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginTop: '4px' }}>
          {legend.map((item) => (
            <span key={item.name} style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              {item.name}
            </span>
          ))}
        </div>
      )}
      {error && <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--accent)' }}>{error}</p>}
    </div>
  )
}
