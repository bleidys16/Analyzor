// Elige y construye 2-3 gráficos automáticos para la pestaña "Análisis" del dashboard,
// a partir de lo que `profileTable` ya calculó (anomalías, correlaciones, data_quality).
// El usuario no pregunta nada: esto es lo primero que ve al abrir sus datos.
import { quoteIdent } from './values'

const CORRELATION_THRESHOLD = 0.3
const MAX_BARS = 20
const SAMPLE_LIMIT = 300
const HISTOGRAM_SAMPLE = 5000

const isNumericDtype = (dtype = '') => {
  const d = dtype.toLowerCase()
  return d.includes('int') || d.includes('float') || d.includes('double') || d.includes('decimal')
}

function pickCategoricalColumn(analysis) {
  const flagged = analysis?.anomalies?.find((a) => a.type === 'low_cardinality')
  if (flagged) return flagged.column

  const candidates = Object.entries(analysis?.data_quality || {})
    .filter(([, dq]) => !isNumericDtype(dq.dtype) && dq.unique_count > 1 && dq.unique_count <= 20)
    .sort((a, b) => a[1].unique_count - b[1].unique_count)
  return candidates[0]?.[0] ?? null
}

function pickNumericColumn(analysis, exclude = []) {
  const candidates = Object.entries(analysis?.data_quality || {})
    .filter(([col, dq]) => isNumericDtype(dq.dtype) && !exclude.includes(col))
  return candidates[0]?.[0] ?? null
}

function strongestCorrelation(correlations) {
  if (!correlations) return null
  let best = null
  for (const [a, row] of Object.entries(correlations)) {
    for (const [b, r] of Object.entries(row)) {
      if (a === b || r === null || r === undefined) continue
      if (Math.abs(r) >= CORRELATION_THRESHOLD && (!best || Math.abs(r) > Math.abs(best.r))) {
        best = { a, b, r }
      }
    }
  }
  return best
}

async function categoryCountChart(runner, col) {
  const q = quoteIdent(col)
  const res = await runner.query(
    `SELECT ${q} AS name, count(*) AS value FROM data GROUP BY ${q} ORDER BY value DESC LIMIT ${MAX_BARS}`
  )
  const data = res.rows.map((r) => ({ name: String(r.name ?? 'N/A'), value: Number(r.value) }))
  if (data.length === 0) return null
  return { type: 'bar', title: `Conteo por ${col}`, data }
}

async function correlationScatter(runner, { a, b, r }) {
  const qa = quoteIdent(a)
  const qb = quoteIdent(b)
  const res = await runner.query(
    `SELECT CAST(${qa} AS DOUBLE) AS x, CAST(${qb} AS DOUBLE) AS y FROM data WHERE ${qa} IS NOT NULL AND ${qb} IS NOT NULL LIMIT ${SAMPLE_LIMIT}`
  )
  const data = res.rows
    .map((row) => ({ x: Number(row.x), y: Number(row.y) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
  if (data.length === 0) return null
  return { type: 'scatter', title: `${a} vs ${b} (correlación ${r.toFixed(2)})`, data }
}

async function numericDistribution(runner, col) {
  const q = quoteIdent(col)
  const res = await runner.query(`SELECT CAST(${q} AS DOUBLE) AS v FROM data WHERE ${q} IS NOT NULL LIMIT ${HISTOGRAM_SAMPLE}`)
  const values = res.rows.map((r) => Number(r.v)).filter(Number.isFinite)
  if (values.length === 0) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const binCount = Math.min(10, new Set(values).size) || 1
  const binSize = max !== min ? (max - min) / binCount : 1
  const counts = new Array(binCount).fill(0)
  for (const v of values) {
    counts[Math.min(Math.floor((v - min) / binSize), binCount - 1)]++
  }
  const decimals = binSize >= 1 ? 1 : binSize >= 0.1 ? 2 : 4
  return {
    type: 'histogram',
    title: `Distribución de ${col}`,
    data: counts.map((count, i) => ({ range: (min + i * binSize).toFixed(decimals), count })),
  }
}

// Devuelve hasta 2 gráficos: uno categórico (lo más anómalo/interesante) y uno numérico
// (la correlación más fuerte si hay una real, o si no, la distribución de una columna numérica).
export async function buildAutoCharts(runner, analysis) {
  const charts = []

  const catCol = pickCategoricalColumn(analysis)
  if (catCol) {
    const chart = await categoryCountChart(runner, catCol)
    if (chart) charts.push(chart)
  }

  const pair = strongestCorrelation(analysis?.correlations)
  if (pair) {
    const chart = await correlationScatter(runner, pair)
    if (chart) charts.push(chart)
  } else {
    const numCol = pickNumericColumn(analysis)
    if (numCol) {
      const chart = await numericDistribution(runner, numCol)
      if (chart) charts.push(chart)
    }
  }

  return charts
}
