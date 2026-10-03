// Elige un gráfico para el resultado de una consulta.
// Formas que entiende ChatMessages.jsx: bar/pie/line -> [{name, value}], scatter -> [{x, y}],
// histogram -> [{range, count}], text -> sin gráfico.

const isNum = (v) => typeof v === 'number'
const label = (v) => String(v ?? 'N/A').slice(0, 20)

const MAX_BARS = 20
const MAX_SLICES = 12
const MAX_LINE_POINTS = 200

// "2025", "2025-03", "2025-03-14" o "2025-03-14 10:00:00": lo que devuelve una columna de fecha o un strftime
const DATE_LIKE = /^(\d{4}-\d{2}(-\d{2})?([ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?)?|(19|20)\d{2})$/
// Un número que en realidad es una unidad de tiempo (resultado de EXTRACT: mes, año...)
const TIME_NAME = /^(mes|meses|month|a[nñ]o|anio|year|d[ií]a|day|semana|week|trimestre|quarter)$/i

// Columnas cuyos valores son partes de un total: las únicas que se dibujan como dona sin que el usuario lo pida
const SHARE_NAME = /^(conteo|count|frecuencia|total_filas|porcentaje|pct)/i

// Tipos de gráfico que el usuario puede pedir con sus palabras
const CHART_WORDS = [
  ['histogram', /\bhistograma\b/],
  ['scatter', /\b(dispersion|scatter|nube de puntos)\b/],
  ['pie', /\b(torta|pastel|pie|dona|donut|circular)\b/],
  ['line', /\b(linea|lineas|lineal|tendencia|evolucion|serie de tiempo|serie temporal)\b/],
  ['bar', /\b(barra|barras)\b/],
]

const normalize = (text) => String(text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Tipo de gráfico que pide el mensaje ("en barras", "una torta", "evolución"...), o null si no pide ninguno.
// Si menciona varios gana el que aparece primero.
export function parseChartRequest(question) {
  const text = normalize(question)
  let best = null
  for (const [type, pattern] of CHART_WORDS) {
    const hit = pattern.exec(text)
    if (hit && (!best || hit.index < best.index)) best = { type, index: hit.index }
  }
  return best?.type ?? null
}

function classify(data, columns) {
  const numeric = []
  const temporal = []
  const categorical = []
  for (const col of columns) {
    const values = data.map((row) => row[col]).filter((v) => v !== null && v !== undefined)
    if (values.length === 0) continue
    if (values.every(isNum)) numeric.push(col)
    else if (values.every((v) => typeof v === 'string' && DATE_LIKE.test(v))) temporal.push(col)
    else categorical.push(col)
  }
  // "mes" o "año" numéricos (EXTRACT) junto a otra métrica son un eje de tiempo, no una métrica
  const timeNumeric = numeric.length >= 2 ? numeric.find((c) => TIME_NAME.test(c)) : undefined
  const measures = numeric.filter((c) => c !== timeNumeric)
  return { numeric, temporal, categorical, timeNumeric, measures }
}

// `listing`: la consulta es un SELECT * (filas crudas, no una agregación)
// `preferred`: tipo de gráfico que pidió el usuario; si no se puede dibujar con estos datos se elige uno automático
export function detectChartType(data, columns, { listing = false, preferred = null } = {}) {
  if (!data || data.length === 0) return { type: 'text', message: 'Sin datos para visualizar' }
  if (listing) return { type: 'text', message: 'Listado de registros' }

  const kinds = classify(data, columns)
  // Un listado de filas (SELECT * ...) no es una agregación: no hay nada útil que graficar
  if (columns.length > 3 && data.length > 1) return { type: 'text', message: 'Listado de registros' }

  const requested = preferred ? chartOfType(preferred, data, kinds) : null
  return requested ?? autoChart(data, kinds)
}

// Eje X "ordenado" (fecha o unidad de tiempo) del resultado, si lo hay
const timeAxis = ({ temporal, timeNumeric }) => temporal[0] ?? timeNumeric

function autoChart(data, kinds) {
  const { numeric, categorical, measures } = kinds
  const x = timeAxis(kinds)

  if (x && measures.length >= 1) {
    if (data.length === 1) return { type: 'text', message: 'Resultado único' }
    return lineChart(data, x, measures[0], { sorted: true })
  }

  if (categorical.length >= 1 && numeric.length >= 1) {
    if (data.length === 1) return { type: 'text', message: 'Resultado único' }
    // Una dona solo tiene sentido cuando los valores son partes de un total (conteos o porcentajes);
    // para promedios, sumas o rankings (lunas por planeta) las barras se leen mejor
    const y = numeric[0]
    const isShare = SHARE_NAME.test(y) && data.length <= 8 && data.every((row) => !isNum(row[y]) || row[y] >= 0)
    return isShare ? pieChart(data, categorical[0], y) : barChart(data, categorical[0], y)
  }
  if (categorical.length >= 1) return pieChart(data, categorical[0], null)

  if (numeric.length >= 2) {
    // Una sola fila con varias métricas (promedios de varias columnas): barras por métrica
    if (data.length === 1) return metricsChart(data[0], numeric)
    return scatterChart(data, numeric[0], numeric[1])
  }
  if (numeric.length === 1) return distributionChart(data, numeric[0])

  return { type: 'text', message: 'No se puede generar gráfico con estos datos' }
}

// Gráfico del tipo pedido, o null si estos datos no permiten dibujarlo
function chartOfType(type, data, kinds) {
  const { numeric, categorical, measures } = kinds
  const x = timeAxis(kinds) ?? categorical[0]
  const y = measures[0] ?? numeric[0]
  const hasSeries = x && y && data.length >= 2

  switch (type) {
    case 'bar':
      return hasSeries ? barChart(data, x, y, { sorted: Boolean(timeAxis(kinds)) }) : null
    case 'line':
      return hasSeries ? lineChart(data, x, y, { sorted: Boolean(timeAxis(kinds)) }) : null
    case 'pie':
      if (x && y && data.length >= 2) return pieChart(data, x, y)
      return categorical.length >= 1 ? pieChart(data, categorical[0], null) : null
    case 'scatter':
      return numeric.length >= 2 && data.length >= 2 ? scatterChart(data, numeric[0], numeric[1]) : null
    case 'histogram':
      return numeric.length >= 1 && data.length >= 2 ? distributionChart(data, numeric[0]) : null
    default:
      return null
  }
}

// Ordena por el eje X: las fechas ISO se ordenan como texto; los números, de menor a mayor
function sortedByX(data, xCol) {
  return [...data].sort((a, b) => {
    const [p, q] = [a[xCol], b[xCol]]
    return isNum(p) && isNum(q) ? p - q : String(p).localeCompare(String(q))
  })
}

function pieChart(data, catCol, numCol) {
  return {
    type: 'pie',
    title: numCol ? `${numCol} por ${catCol}` : `Distribución de ${catCol}`,
    data: data.slice(0, MAX_SLICES).map((row) => ({
      name: label(row[catCol]),
      // un sector no puede ser negativo ni nulo: se descarta de la proporción
      value: numCol && isNum(row[numCol]) ? Math.max(row[numCol], 0) : 1,
    })),
  }
}

function barChart(data, xCol, yCol, { sorted = false } = {}) {
  const rows = sorted ? sortedByX(data, xCol) : data
  return {
    type: 'bar',
    title: `${yCol} por ${xCol}`,
    data: rows.slice(0, MAX_BARS).map((row) => ({
      name: label(row[xCol]),
      value: isNum(row[yCol]) ? row[yCol] : 0,
    })),
    x_axis: xCol,
    y_axis: yCol,
  }
}

// `sorted`: el eje X es tiempo y se ordena cronológicamente; con categorías se respeta el orden de la consulta
function lineChart(data, xCol, yCol, { sorted = false } = {}) {
  const valid = data.filter((row) => isNum(row[yCol]))
  const rows = sorted ? sortedByX(valid, xCol) : valid
  return {
    type: 'line',
    title: `${yCol} por ${xCol}`,
    data: rows.slice(0, MAX_LINE_POINTS).map((row) => ({ name: String(row[xCol]), value: row[yCol] })),
    x_axis: xCol,
    y_axis: yCol,
  }
}

function metricsChart(row, numericCols) {
  return {
    type: 'bar',
    title: 'Métricas',
    data: numericCols.slice(0, MAX_BARS).map((col) => ({ name: label(col), value: row[col] })),
    x_axis: 'Métrica',
    y_axis: 'Valor',
  }
}

function scatterChart(data, xCol, yCol) {
  return {
    type: 'scatter',
    title: `${yCol} vs ${xCol}`,
    data: data
      .slice(0, 50)
      .filter((row) => isNum(row[xCol]) && isNum(row[yCol]))
      .map((row) => ({ x: row[xCol], y: row[yCol] })),
    x_axis: xCol,
    y_axis: yCol,
  }
}

function distributionChart(data, col) {
  const values = data.map((row) => row[col]).filter(isNum)
  if (values.length === 0) return { type: 'text', message: `No hay valores numéricos en ${col}` }
  if (values.length === 1) {
    return {
      type: 'bar',
      title: col.replace(/_/g, ' '),
      data: [{ name: col.replace(/_/g, ' '), value: values[0] }],
      x_axis: 'Métrica',
      y_axis: 'Valor',
    }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const binCount = Math.min(10, new Set(values).size)
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
    column: col,
  }
}
