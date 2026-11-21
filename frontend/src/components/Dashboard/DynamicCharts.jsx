import { useEffect, useState } from 'react'
import { analysisAPI } from '../../api/analysis'
import ChartRenderer from '../Chat/ChartRenderer'

export default function DynamicCharts({ datasetId, dataset, analysis, onViewAnomalyRows, onAskAnomaly }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <AutoCharts key={datasetId} datasetId={datasetId} analysis={analysis} />
      <DatasetSummary
        dataset={dataset}
        analysis={analysis}
        onViewAnomalyRows={onViewAnomalyRows}
        onAskAnomaly={onAskAnomaly}
      />
    </div>
  )
}

// Lo primero que ve el usuario: 1-2 gráficos elegidos por el motor a partir de lo que ya detectó
// (anomalías, correlaciones), sin que nadie pregunte nada en el chat.
function AutoCharts({ datasetId, analysis }) {
  const [charts, setCharts] = useState(null)

  useEffect(() => {
    let cancelled = false
    analysisAPI.getAutoCharts(datasetId, analysis)
      .then((res) => { if (!cancelled) setCharts(res.data) })
      .catch((err) => {
        console.warn('No se pudieron generar los gráficos automáticos:', err)
        if (!cancelled) setCharts([])
      })
    return () => { cancelled = true }
  }, [datasetId, analysis])

  if (charts === null) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        {[0, 1].map((i) => (
          <div key={i} style={{
            background: 'var(--chart-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '12px',
            height: '220px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '12px',
          }} aria-hidden="true">
            Generando gráfico…
          </div>
        ))}
      </div>
    )
  }

  if (charts.length === 0) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
    }}>
      {charts.map((chart, i) => (
        <div key={i} style={{
          background: 'var(--chart-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '16px',
          minWidth: 0,
          overflow: 'hidden',
        }}>
          <ChartRenderer chartConfig={chart} />
        </div>
      ))}
    </div>
  )
}

function extractCorrelationPairs(correlations) {
  if (!correlations || typeof correlations !== 'object') return []
  const cols = Object.keys(correlations)
  const pairs = []
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const a = cols[i]
      const b = cols[j]
      const r = correlations[a]?.[b]
      if (r !== null && r !== undefined && !Number.isNaN(r)) {
        pairs.push({ a, b, r })
      }
    }
  }
  return pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r))
}

function DatasetSummary({ dataset, analysis, onViewAnomalyRows, onAskAnomaly }) {
  const columns = dataset?.columns || []
  const dtypes = dataset?.dtypes || {}
  const analysisData = analysis || dataset?.analysis || {}

  const isNumericType = (col) => {
    const dtype = dtypes?.[col] || analysisData?.data_quality?.[col]?.dtype || ''
    const dtypeLower = dtype.toLowerCase()
    return dtypeLower.includes('int') || dtypeLower.includes('float') || dtypeLower.includes('decimal') || dtypeLower.includes('double') || dtypeLower === 'integer'
  }
  const numericCols = columns.filter(isNumericType)
  const categoricCols = columns.filter(c => !numericCols.includes(c))
  const anomalyColumns = new Set((analysisData?.anomalies || []).map((a) => a.column))
  const correlationPairs = extractCorrelationPairs(analysisData?.correlations)

  return (
    <>
      {/* KPIs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
      }}>
        <KPI value={dataset?.rows_count?.toLocaleString()} label="Filas" />
        <KPI value={columns.length} label="Columnas" />
        <KPI value={numericCols.length} label="Numéricas" />
        <KPI value={categoricCols.length} label="Categóricas" />
        <KPI value={`${(dataset?.file_size / 1024).toFixed(1)} KB`} label="Tamaño" />
      </div>

      {/* Anomalías con Click-To-Action directo */}
      {analysisData?.anomalies?.length > 0 && (
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--warning)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{
            margin: '0 0 14px 0',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Anomalías Detectadas ({analysisData.anomalies.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {analysisData.anomalies.map((a, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                background: 'var(--card-bg)',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid var(--card-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px' }}>
                  <span style={{ color: 'var(--warning)', fontSize: '14px' }}>⚠️</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>
                    {a.message}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {a.type === 'high_missing' && (
                    <button
                      onClick={() => onViewAnomalyRows?.(a)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--code-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.color = 'var(--accent-text)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--card-border)'
                        e.currentTarget.style.color = 'var(--text-main)'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      Ver filas con nulos
                    </button>
                  )}
                  {a.type === 'low_cardinality' && (
                    <button
                      onClick={() => onViewAnomalyRows?.(a)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--code-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent)'
                        e.currentTarget.style.color = 'var(--accent-text)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--card-border)'
                        e.currentTarget.style.color = 'var(--text-main)'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
                      </svg>
                      Ver distribución
                    </button>
                  )}
                  <button
                    onClick={() => onAskAnomaly?.(a)}
                    style={{
                      padding: '6px 12px',
                      background: 'var(--accent-glow)',
                      border: '1px solid var(--accent)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--accent-text)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-strong)'
                      e.currentTarget.style.color = '#ffffff'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--accent-glow)'
                      e.currentTarget.style.color = 'var(--accent-text)'
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Preguntar por esta anomalía
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Una sola fila por columna: tipo, nulos, únicos y el detalle relevante según el tipo,
          en vez de obligar a cruzar tres tablas separadas para entender una sola columna. */}
      <div style={{
        background: 'var(--chart-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
          Columnas
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                <th scope="col" style={thStyle}>Columna</th>
                <th scope="col" style={thStyle}>Tipo</th>
                <th scope="col" style={thStyle}>Nulos</th>
                <th scope="col" style={thStyle}>Únicos</th>
                <th scope="col" style={thStyle}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {columns.map(col => {
                const dq = analysisData?.data_quality?.[col] || {}
                const isNum = numericCols.includes(col)
                const s = analysisData?.statistics?.[col] || {}
                return (
                  <tr key={col} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={tdStyle}>
                      <strong>{col}</strong>
                      {anomalyColumns.has(col) && (
                        <span title="Esta columna tiene una anomalía detectada" style={{ color: 'var(--warning)', marginLeft: '6px' }} aria-hidden="true">⚑</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        background: isNum ? '#eff6ff' : '#fef3c7',
                        color: isNum ? '#1d4ed8' : '#92400e',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}>
                        {dtypes[col] || dq.dtype || '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: (dq.null_pct || 0) > 20 ? 'var(--accent-text)' : '#10b981', fontWeight: 600 }}>
                        {dq.null_pct !== undefined ? `${dq.null_pct.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>{dq.unique_count ?? '—'}</td>
                    <td style={{ ...tdStyle, whiteSpace: 'normal', color: 'var(--text-muted)' }}>
                      {isNum
                        ? `Media ${s.mean?.toFixed(2) ?? '—'} · Mediana ${s.median?.toFixed(2) ?? '—'} · Rango ${s.min?.toFixed(2) ?? '—'}–${s.max?.toFixed(2) ?? '—'}`
                        : `Más común: ${s.most_common ?? '—'} · Cardinalidad ${(dq.cardinality ?? 0).toFixed(1)}%`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correlaciones calculadas */}
      {correlationPairs.length > 0 && (
        <div style={{
          background: 'var(--chart-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
              Correlaciones Estadísticas ({correlationPairs.length})
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Coeficiente de Pearson (r)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                  <th scope="col" style={thStyle}>Variable 1</th>
                  <th scope="col" style={thStyle}>Variable 2</th>
                  <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>Coeficiente (r)</th>
                  <th scope="col" style={thStyle}>Relación</th>
                </tr>
              </thead>
              <tbody>
                {correlationPairs.map(({ a, b, r }) => {
                  const absR = Math.abs(r)
                  const strength = absR >= 0.7 ? 'Fuerte' : absR >= 0.3 ? 'Moderada' : 'Débil'
                  const isPositive = r >= 0
                  const badgeStyle = absR >= 0.7
                    ? { bg: isPositive ? '#eff6ff' : '#fef2f2', text: isPositive ? '#1d4ed8' : '#b91c1c' }
                    : absR >= 0.3
                    ? { bg: '#fef3c7', text: '#92400e' }
                    : { bg: 'var(--code-bg)', text: 'var(--text-muted)' }

                  return (
                    <tr key={`${a}-${b}`} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={tdStyle}><strong>{a}</strong></td>
                      <td style={tdStyle}><strong>{b}</strong></td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2)}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: badgeStyle.bg,
                          color: badgeStyle.text,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}>
                          {strength} {isPositive ? '(+)' : '(-)'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function KPI({ value, label }) {
  return (
    <div style={{
      background: 'var(--chart-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: '10px',
      padding: '16px',
      textAlign: 'center',
    }}>
      <p style={{ margin: '0 0 2px 0', fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>{value}</p>
      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</p>
    </div>
  )
}

const thStyle = {
  padding: '10px 12px',
  textAlign: 'left',
  fontWeight: 700,
  color: 'var(--text-muted)',
  fontSize: '11px',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '8px 12px',
  color: 'var(--text-main)',
  whiteSpace: 'nowrap',
}
