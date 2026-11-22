import { useRef, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis,
} from 'recharts'
import { chartToPng, downloadBlob, slugify } from '../../utils/chartImage'

const chartColors = ['#e11d48', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']
const pieColors = ['#e11d48', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#d946ef']

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

// Genera un resumen humano conciso en una frase que explica el hallazgo clave del gráfico
function generateHumanChartInsight(chartConfig) {
  if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) return null
  const { type, data } = chartConfig
  const nf = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })

  if (type === 'bar' || type === 'pie') {
    const valid = data.filter((d) => typeof d.value === 'number' && !isNaN(d.value))
    if (valid.length === 0) return null
    const total = valid.reduce((sum, d) => sum + Math.max(0, d.value), 0)
    const sorted = [...valid].sort((a, b) => b.value - a.value)
    const top = sorted[0]

    if (total > 0 && top) {
      const pct = Math.round((Math.max(0, top.value) / total) * 100)
      if (valid.length === 1) {
        return `El 100% de los datos corresponde a "${top.name}" (${nf.format(top.value)}).`
      }
      if (pct >= 50) {
        return `El ${pct}% del total se concentra en "${top.name}" (${nf.format(top.value)}).`
      }
      return `"${top.name}" lidera con el ${pct}% del total (${nf.format(top.value)}), seguido de "${sorted[1]?.name || ''}".`
    }
    if (top) {
      return `El valor más alto corresponde a "${top.name}" con ${nf.format(top.value)}.`
    }
  }

  if (type === 'line') {
    const valid = data.filter((d) => typeof d.value === 'number' && !isNaN(d.value))
    if (valid.length === 0) return null
    const sorted = [...valid].sort((a, b) => b.value - a.value)
    const peak = sorted[0]
    const trough = sorted[sorted.length - 1]
    const first = valid[0]
    const last = valid[valid.length - 1]

    if (valid.length >= 2 && first.value !== 0) {
      const change = Math.round(((last.value - first.value) / Math.abs(first.value)) * 100)
      const dir = change > 0 ? 'crecimiento' : change < 0 ? 'descenso' : 'estabilidad'
      const peakTxt = peak ? ` (máximo: ${nf.format(peak.value)} en ${peak.name})` : ''
      if (change !== 0) {
        return `Tendencia de ${dir} del ${Math.abs(change)}% entre ${first.name} y ${last.name}${peakTxt}.`
      }
    }
    if (peak && trough && peak.name !== trough.name) {
      return `Pico máximo en "${peak.name}" (${nf.format(peak.value)}) y menor registro en "${trough.name}" (${nf.format(trough.value)}).`
    }
  }

  if (type === 'histogram') {
    const valid = data.filter((d) => typeof d.count === 'number')
    if (valid.length === 0) return null
    const total = valid.reduce((acc, d) => acc + d.count, 0)
    const sorted = [...valid].sort((a, b) => b.count - a.count)
    const top = sorted[0]
    if (top && total > 0) {
      const pct = Math.round((top.count / total) * 100)
      return `La mayor concentración (${pct}% de registros) se ubica en el intervalo "${top.range}".`
    }
  }

  if (type === 'scatter') {
    return `Se muestran ${data.length} puntos analizados para evaluar correlación.`
  }

  return null
}

export default function ChartRenderer({ chartConfig }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [copiedChart, setCopiedChart] = useState(false)
  const [copiedData, setCopiedData] = useState(false)
  const [error, setError] = useState(null)

  const plot = chartConfig && chartConfig.type !== 'text' ? renderPlot(chartConfig) : null
  if (!plot) return null

  const height = HEIGHT[chartConfig.type] ?? 220
  const legend = chartConfig.type === 'pie'
    ? chartConfig.data.map((d, i) => ({ name: d.name, color: pieColors[i % pieColors.length] }))
    : []

  const insight = generateHumanChartInsight(chartConfig)

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

  const copyChart = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await chartToPng(ref.current, { title: chartConfig.title, legend })
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        setCopiedChart(true)
        setTimeout(() => setCopiedChart(false), 2000)
      } else {
        throw new Error('ClipboardItem no soportado')
      }
    } catch (err) {
      console.warn('No se pudo copiar el gráfico al portapapeles:', err)
      setError('No se pudo copiar la imagen al portapapeles en este navegador')
    } finally {
      setBusy(false)
    }
  }

  const copyChartData = async () => {
    try {
      if (!chartConfig.data || chartConfig.data.length === 0) return
      let tsv = ''
      if (chartConfig.data[0].name !== undefined && chartConfig.data[0].value !== undefined) {
        tsv = ['Elemento\tValor', ...chartConfig.data.map((d) => `${d.name}\t${d.value}`)].join('\n')
      } else {
        const keys = Object.keys(chartConfig.data[0])
        tsv = [keys.join('\t'), ...chartConfig.data.map((d) => keys.map((k) => d[k] ?? '').join('\t'))].join('\n')
      }
      await navigator.clipboard.writeText(tsv)
      setCopiedData(true)
      setTimeout(() => setCopiedData(false), 2000)
    } catch (err) {
      console.warn('No se pudieron copiar los datos:', err)
    }
  }

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{chartConfig.title}</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            onClick={copyChart}
            disabled={busy}
            title="Copiar imagen del gráfico al portapapeles con 1 clic"
            aria-label="Copiar gráfico al portapapeles"
            style={{
              background: copiedChart ? 'var(--accent-strong)' : 'var(--code-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              color: copiedChart ? 'white' : 'var(--text-muted)',
              cursor: busy ? 'wait' : 'pointer',
              fontSize: '11px',
              padding: '3px 8px',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
            }}
          >
            {copiedChart ? '¡Copiado!' : 'Copiar gráfico'}
          </button>
          <button
            onClick={download}
            disabled={busy}
            title="Descargar el gráfico como imagen PNG"
            aria-label="Descargar gráfico PNG"
            style={{
              background: 'none',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              color: 'var(--text-muted)',
              cursor: busy ? 'wait' : 'pointer',
              fontSize: '11px',
              padding: '3px 8px',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {busy ? 'Generando…' : 'PNG'}
          </button>
          <button
            onClick={copyChartData}
            title="Copiar datos del gráfico para pegar en Excel o Google Sheets"
            aria-label="Copiar datos a Excel"
            style={{
              background: copiedData ? 'var(--accent-strong)' : 'none',
              border: '1px solid var(--card-border)',
              borderRadius: '6px',
              color: copiedData ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '3px 8px',
              fontFamily: 'inherit',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            {copiedData ? '¡Datos copiados!' : 'Excel'}
          </button>
        </div>
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

      {insight && (
        <div style={{
          marginTop: '8px',
          padding: '7px 10px',
          background: 'var(--code-bg)',
          borderLeft: '3px solid var(--accent-strong)',
          borderRadius: '0 8px 8px 0',
          fontSize: '11.5px',
          color: 'var(--text-main)',
          lineHeight: '1.45',
          display: 'flex',
          alignItems: 'baseline',
          gap: '6px',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, alignSelf: 'center' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span>{insight}</span>
        </div>
      )}

      {error && <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--accent-text)' }}>{error}</p>}
    </div>
  )
}
