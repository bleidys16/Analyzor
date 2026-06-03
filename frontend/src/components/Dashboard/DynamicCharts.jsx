export default function DynamicCharts({ dataset, analysis }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <DatasetSummary dataset={dataset} analysis={analysis} />
    </div>
  )
}

function DatasetSummary({ dataset, analysis }) {
  const columns = dataset?.columns || []
  const dtypes = dataset?.dtypes || {}
  const analysisData = analysis || dataset?.analysis || {}
  const preview = dataset?.preview || []

  const isNumericType = (col) => {
    const dtype = dtypes?.[col] || analysisData?.data_quality?.[col]?.dtype || ''
    const dtypeLower = dtype.toLowerCase()
    return dtypeLower.includes('int') || dtypeLower.includes('float') || dtypeLower.includes('decimal') || dtypeLower.includes('double') || dtypeLower === 'integer'
  }
  const numericCols = columns.filter(isNumericType)
  const categoricCols = columns.filter(c => !numericCols.includes(c))

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

      {/* Resumen de columnas */}
      <div style={{
        background: 'var(--chart-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        padding: '20px',
      }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
          Resumen de Columnas
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                <th style={thStyle}>Columna</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Nulos</th>
                <th style={thStyle}>Únicos</th>
                
              </tr>
            </thead>
            <tbody>
              {columns.map(col => {
                const dq = analysisData?.data_quality?.[col] || {}
                const stats = analysisData?.statistics?.[col] || {}
                const isNum = numericCols.includes(col)
                return (
                  <tr key={col} style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <td style={tdStyle}><strong>{col}</strong></td>
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
                      <span style={{ color: (dq.null_pct || 0) > 20 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                        {dq.null_pct !== undefined ? `${dq.null_pct.toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>{dq.unique_count ?? '—'}</td>
                    
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estadísticas descriptivas (numéricas) */}
      {numericCols.length > 0 && (
        <div style={{
          background: 'var(--chart-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
            Estadísticas Descriptivas
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--card-border)' }}>
                  <th style={thStyle}>Columna</th>
                  <th style={thStyle}>Media</th>
                  <th style={thStyle}>Mediana</th>
                  <th style={thStyle}>Desv Std</th>
                  <th style={thStyle}>Mín</th>
                  <th style={thStyle}>Máx</th>
                  <th style={thStyle}>Q25</th>
                  <th style={thStyle}>Q75</th>
                </tr>
              </thead>
              <tbody>
                {numericCols.map(col => {
                  const s = analysisData?.statistics?.[col] || {}
                  return (
                    <tr key={col} style={{ borderBottom: '1px solid var(--card-border)' }}>
                      <td style={tdStyle}><strong>{col}</strong></td>
                      <td style={tdNumStyle}>{s.mean?.toFixed(2) ?? '—'}</td>
                      <td style={tdNumStyle}>{s.median?.toFixed(2) ?? '—'}</td>
                      <td style={tdNumStyle}>{s.std?.toFixed(2) ?? '—'}</td>
                      <td style={tdNumStyle}>{s.min?.toFixed(2) ?? '—'}</td>
                      <td style={tdNumStyle}>{s.max?.toFixed(2) ?? '—'}</td>
                      <td style={tdNumStyle}>{s.q25?.toFixed(2) ?? '—'}</td>
                      <td style={tdNumStyle}>{s.q75?.toFixed(2) ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Distribución de categóricas (top valores) */}
      {categoricCols.length > 0 && (
        <div style={{
          background: 'var(--chart-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
            Distribución de Categóricas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {categoricCols.map(col => {
              const dq = analysisData?.data_quality?.[col] || {}
              const stats = analysisData?.statistics?.[col] || {}
              return (
                <div key={col}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {col}
                    <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '8px' }}>
                      {dq.unique_count ?? 0} valores únicos · Más común: <strong>{stats.most_common || '—'}</strong>
                    </span>
                  </p>
                  <div style={{
                    height: '4px',
                    background: 'var(--code-bg)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${dq.cardinality || 0}%`,
                      background: 'var(--accent)',
                      borderRadius: '2px',
                    }} />
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '10px', color: 'var(--text-muted)' }}>
                    Cardinalidad: {(dq.cardinality || 0).toFixed(1)}%
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Anomalías */}
      {analysisData?.anomalies?.length > 0 && (
        <div style={{
          background: 'var(--code-bg)',
          border: '1px solid var(--accent)',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>
            ⚠️ Anomalías Detectadas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {analysisData.anomalies.map((a, i) => (
              <p key={i} style={{ margin: 0, fontSize: '13px', color: 'var(--accent)', fontWeight: 500 }}>
                {a.message}
              </p>
            ))}
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

const tdNumStyle = {
  padding: '8px 12px',
  color: 'var(--text-main)',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
}
