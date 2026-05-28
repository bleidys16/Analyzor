export default function CorrelationHeatmap({ correlations }) {
  if (!correlations || Object.keys(correlations).length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
        No hay suficientes columnas numéricas para correlaciones
      </div>
    )
  }

  const columns = Object.keys(correlations)

  const getColor = (value) => {
    if (value === null || value === undefined) return '#f1f5f9'
    const abs = Math.abs(value)
    if (value > 0) {
      return `rgba(59, 130, 246, ${0.15 + abs * 0.85})`
    }
    return `rgba(239, 68, 68, ${0.15 + abs * 0.85})`
  }

  const getTextColor = (value) => {
    return Math.abs(value) > 0.6 ? '#ffffff' : '#0f172a'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        borderCollapse: 'collapse',
        fontSize: '11px',
        width: '100%',
        minWidth: '300px',
      }}>
        <thead>
          <tr>
            <th style={{ padding: '8px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: '10px' }}></th>
            {columns.map(col => (
              <th key={col} style={{
                padding: '8px 4px',
                textAlign: 'center',
                color: '#64748b',
                fontWeight: 700,
                fontSize: '10px',
                writingMode: 'vertical-lr',
                height: '80px',
                whiteSpace: 'nowrap',
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {columns.map((rowCol, i) => (
            <tr key={rowCol}>
              <td style={{
                padding: '8px',
                fontWeight: 600,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                fontSize: '10px',
              }}>
                {rowCol}
              </td>
              {columns.map((colCol) => {
                const val = correlations[rowCol]?.[colCol]
                return (
                  <td key={colCol} style={{
                    padding: '8px 4px',
                    textAlign: 'center',
                    background: getColor(val),
                    color: getTextColor(val),
                    fontWeight: Math.abs(val) > 0.5 ? 700 : 400,
                    borderRadius: '4px',
                    fontSize: '11px',
                    minWidth: '50px',
                  }}>
                    {val !== null && val !== undefined ? val.toFixed(2) : '-'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginTop: '12px',
        fontSize: '10px',
        color: '#64748b',
      }}>
        <span>🔵 Correlación positiva</span>
        <span>🔴 Correlación negativa</span>
        <span>⬜ Sin correlación</span>
      </div>
    </div>
  )
}
