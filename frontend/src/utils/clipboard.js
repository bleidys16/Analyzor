// Convierte texto tabulado (copiado de Excel o Google Sheets) a CSV válido con escape de comillas
export function clipboardToCsv(text) {
  if (!text || typeof text !== 'string') return ''
  const trimmed = text.trim()
  if (!trimmed) return ''

  const lines = trimmed.split(/\r?\n/).filter((line) => line.length > 0)
  if (lines.length === 0) return ''

  const isTsv = lines[0].includes('\t')
  if (isTsv) {
    return lines.map((line) => {
      const cells = line.split('\t')
      return cells.map((cell) => {
        const c = cell.trim()
        if (c.includes(',') || c.includes('"') || c.includes('\n') || c.includes('\r')) {
          return `"${c.replace(/"/g, '""')}"`
        }
        return c
      }).join(',')
    }).join('\n')
  }

  return trimmed
}

// Micro-inspección rápida de texto/archivo en memoria (< 5 ms)
export function inspectCsvSnippet(text) {
  if (!text || typeof text !== 'string') return { rowsCount: 0, colsCount: 0 }
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  const rowsCount = Math.max(0, lines.length - 1)
  const firstLine = lines[0] || ''
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ','
  const colsCount = firstLine.split(delimiter).length
  return { rowsCount, colsCount }
}
