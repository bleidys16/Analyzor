// Motor de reglas: genera SQL para preguntas comunes sin depender de la IA.
import { isIdColumn, quoteIdent } from './values'

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Coincidencia por palabra completa (evita que "ver" case dentro de "conversión" o "min" en "administrador")
function hasWord(text, words) {
  return words.some((w) => new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRe(w)}($|[^\\p{L}\\p{N}_])`, 'iu').test(text))
}

const INTENT = {
  avg: ['promedio', 'media', 'average', 'avg', 'mean'],
  sum: ['suma', 'sum', 'total'],
  max: ['máximo', 'maximo', 'mayor', 'más alto', 'mas alto', 'max', 'maximum'],
  min: ['mínimo', 'minimo', 'menor', 'más bajo', 'mas bajo', 'min', 'minimum'],
  count: ['cuántos', 'cuantos', 'cuántas', 'cuantas', 'count', 'conteo', 'número de', 'numero de'],
  distribution: ['distribución', 'distribucion', 'histograma', 'histogram', 'frecuencia'],
  correlation: ['correlación', 'correlacion', 'relación', 'relacion', 'correlation'],
  group: ['agrupar', 'agrupa', 'group', 'categoria', 'categoría', 'por'],
  pie: ['torta', 'pie', 'pastel', 'porcentaje', 'circular'],
  chart: ['gráfico', 'grafico', 'gráfica', 'grafica', 'graficar', 'grafícame', 'graficame', 'diagrama', 'visualiza', 'visualizar', 'visualización', 'visualizacion', 'dibuja', 'dibujar', 'plot'],
  month: ['mes', 'meses', 'mensual', 'mensuales', 'month', 'monthly'],
  year: ['año', 'años', 'anual', 'anuales', 'year', 'yearly'],
  trend: ['tendencia', 'evolución', 'evolucion'],
  show: ['muestra', 'muéstrame', 'muestrame', 'mostrar', 'ver', 'show', 'display', 'todos', 'datos', 'lista', 'listar', 'primeros', 'resumen'],
}

// Palabras que indican que la pregunta trata del dataset aunque no nombre una columna
const DATASET_WORDS = ['datos', 'dato', 'dataset', 'tabla', 'registros', 'registro', 'filas', 'fila', 'columnas', 'columna', 'csv', 'archivo', 'resumen', 'información', 'informacion']

// Columnas que la pregunta menciona. Solo se comparan palabras de 4+ letras: así "de", "el" o "los"
// no casan con nombres de columna como "Descripcion".
export function matchColumns(question, columns) {
  const words = new Set((question.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []).filter((w) => w.length >= 4))
  return columns.filter((col) => {
    const name = col.toLowerCase()
    const parts = name.split(/[\s_-]+/).filter(Boolean)
    for (const w of words) {
      if (name.includes(w) || (name.length >= 4 && w.includes(name))) return true
      if (parts.some((p) => p.length >= 4 && w.includes(p))) return true
    }
    return false
  })
}

const isNumericCol = (col, dtypes) => ['integer', 'float'].includes(String(dtypes?.[col] || '').toLowerCase())

export function generateFallbackSql(question, columns, dtypes = {}) {
  const q = question.toLowerCase().trim()
  const matched = matchColumns(q, columns)
  // Si la pregunta no trata de los datos (saludos, programación, cultura general...) las reglas no la contestan:
  // palabras sueltas como "mostrar" o "menor" no deben disparar una consulta sin relación
  if (matched.length === 0 && !hasWord(q, DATASET_WORDS)) return null
  const numeric = columns.filter((c) => isNumericCol(c, dtypes))
  const measurable = numeric.filter((c) => !isIdColumn(c))
  const measures = measurable.length ? measurable : numeric

  const aggregate = (fn, alias, { numericOnly }) => {
    // "promedio de ventas por ciudad": agrupa por la columna de texto mencionada
    const groupCol = matched.find((c) => !isNumericCol(c, dtypes))
    const valueCol = matched.find((c) => isNumericCol(c, dtypes) && !isIdColumn(c))
    if (hasWord(q, ['por']) && groupCol && valueCol) {
      const g = quoteIdent(groupCol)
      const name = quoteIdent(`${alias}_${valueCol}`)
      return `SELECT ${g}, ${fn}(${quoteIdent(valueCol)}) AS ${name} FROM data GROUP BY ${g} ORDER BY ${name} DESC LIMIT 20`
    }

    const pool = numericOnly ? matched.filter((c) => isNumericCol(c, dtypes)) : matched
    if (pool.length) {
      const col = quoteIdent(pool[0])
      return `SELECT ${fn}(${col}) AS ${quoteIdent(`${alias}_${pool[0]}`)} FROM data`
    }
    if (!measures.length) return null
    const parts = measures.map((c) => `${fn}(${quoteIdent(c)}) AS ${quoteIdent(`${alias}_${c}`)}`)
    return `SELECT ${parts.join(', ')} FROM data`
  }

  const isDateCol = (c) => String(dtypes?.[c] || '').toLowerCase() === 'datetime'

  // Serie de tiempo: agrupa una columna de fecha por mes o año (strftime deja la etiqueta ordenable: 2025-03)
  const timeSql = (dateCol, grain) => {
    const d = quoteIdent(dateCol)
    const bucket = `strftime(date_trunc('${grain}', ${d}), '${grain === 'year' ? '%Y' : '%Y-%m'}')`
    const valueCol = matched.find((c) => isNumericCol(c, dtypes) && !isIdColumn(c)) ?? measures[0]
    let metric = 'COUNT(*) AS "conteo"'
    if (valueCol && !hasWord(q, INTENT.count)) {
      const [fn, alias] = hasWord(q, INTENT.avg) ? ['AVG', 'promedio']
        : hasWord(q, INTENT.max) ? ['MAX', 'max']
        : hasWord(q, INTENT.min) ? ['MIN', 'min']
        : ['SUM', 'total']
      metric = `${fn}(${quoteIdent(valueCol)}) AS ${quoteIdent(`${alias}_${valueCol}`)}`
    }
    return `SELECT ${bucket} AS ${quoteIdent(grain === 'year' ? 'año' : 'mes')}, ${metric} FROM data WHERE ${d} IS NOT NULL GROUP BY 1 ORDER BY 1`
  }

  const grain = hasWord(q, INTENT.month) ? 'month' : hasWord(q, INTENT.year) ? 'year' : hasWord(q, INTENT.trend) ? 'month' : null
  const dateCol = matched.find(isDateCol) ?? columns.find(isDateCol)
  if (grain && dateCol) return timeSql(dateCol, grain)

  if (hasWord(q, INTENT.avg)) return aggregate('AVG', 'promedio', { numericOnly: true })
  if (hasWord(q, INTENT.sum)) return aggregate('SUM', 'total', { numericOnly: true })
  if (hasWord(q, INTENT.max)) return aggregate('MAX', 'max', { numericOnly: false })
  if (hasWord(q, INTENT.min)) return aggregate('MIN', 'min', { numericOnly: false })

  if (hasWord(q, INTENT.count)) {
    if (matched.length) {
      const col = quoteIdent(matched[0])
      return `SELECT ${col}, COUNT(*) AS "conteo" FROM data GROUP BY ${col} ORDER BY "conteo" DESC LIMIT 20`
    }
    return 'SELECT COUNT(*) AS "total_filas" FROM data'
  }

  // "haz un gráfico de la cantidad de lunas por planeta": devuelve los datos a graficar (la app dibuja el gráfico)
  if (hasWord(q, INTENT.chart)) {
    const cat = matched.find((c) => !isNumericCol(c, dtypes) && !isDateCol(c))
    const num = matched.find((c) => isNumericCol(c, dtypes) && !isIdColumn(c))
    const mentionedDate = matched.find(isDateCol)
    if (mentionedDate) return timeSql(mentionedDate, 'month')
    if (cat && num) {
      const [fn, alias] = hasWord(q, ['cantidad', 'total', 'suma', 'sum']) ? ['SUM', 'total'] : ['AVG', 'promedio']
      const name = quoteIdent(`${alias}_${num}`)
      return `SELECT ${quoteIdent(cat)}, ${fn}(${quoteIdent(num)}) AS ${name} FROM data WHERE ${quoteIdent(cat)} IS NOT NULL GROUP BY ${quoteIdent(cat)} ORDER BY ${name} DESC LIMIT 20`
    }
    if (cat) return pieSql(cat)
    if (num) return `SELECT ${quoteIdent(num)} FROM data WHERE ${quoteIdent(num)} IS NOT NULL`
    return null
  }

  if (hasWord(q, INTENT.distribution)) {
    if (!matched.length) return null
    const col = quoteIdent(matched[0])
    return `SELECT ${col} FROM data WHERE ${col} IS NOT NULL`
  }

  if (hasWord(q, INTENT.correlation)) {
    const pair = matched.filter((c) => isNumericCol(c, dtypes))
    const cols = pair.length >= 2 ? pair : measures
    if (cols.length < 2) return null
    const [a, b] = [quoteIdent(cols[0]), quoteIdent(cols[1])]
    return `SELECT ${a}, ${b} FROM data WHERE ${a} IS NOT NULL AND ${b} IS NOT NULL LIMIT 100`
  }

  if (hasWord(q, INTENT.pie) || hasWord(q, INTENT.group)) {
    const cat = matched.find((c) => !isNumericCol(c, dtypes)) || matched[0]
    if (!cat) return hasWord(q, INTENT.pie) && columns.length ? pieSql(columns[0]) : null
    const num = matched.find((c) => isNumericCol(c, dtypes) && !isIdColumn(c) && c !== cat)
    if (num && !hasWord(q, INTENT.pie)) {
      return `SELECT ${quoteIdent(cat)}, AVG(${quoteIdent(num)}) AS "promedio" FROM data GROUP BY ${quoteIdent(cat)} ORDER BY "promedio" DESC LIMIT 20`
    }
    return pieSql(cat)
  }

  if (hasWord(q, INTENT.show)) return 'SELECT * FROM data LIMIT 50'
  return null
}

function pieSql(column) {
  const col = quoteIdent(column)
  return `SELECT ${col}, COUNT(*) AS "conteo" FROM data WHERE ${col} IS NOT NULL GROUP BY ${col} ORDER BY "conteo" DESC LIMIT 20`
}

const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })
const fmt = (v) => (typeof v === 'number' ? numberFormat.format(v) : String(v))
const stripPrefix = (col) => col.replace(/^(promedio|total|max|min)_/, '')

// Respuesta en texto para el resultado de una consulta generada por reglas
export function generateFallbackAnswer(question, result, sql) {
  const { data, columns, row_count: rowCount } = result
  if (!data || data.length === 0) return 'No se encontraron datos para tu pregunta.'

  const q = question.toLowerCase()
  const note = result.truncated ? ` (mostrando las primeras ${rowCount})` : ''

  if (rowCount === 1) {
    const row = data[0]
    const label = hasWord(q, INTENT.avg) ? 'El promedio de'
      : hasWord(q, INTENT.max) ? 'El valor máximo de'
      : hasWord(q, INTENT.min) ? 'El valor mínimo de'
      : hasWord(q, INTENT.sum) ? 'La suma total de'
      : null

    if (columns.length === 1) {
      const value = row[columns[0]]
      if (value === null) return `No hay valores para calcular **${stripPrefix(columns[0])}**.`
      return label
        ? `${label} **${stripPrefix(columns[0])}** es **${fmt(value)}**`
        : `El resultado es: **${fmt(value)}**`
    }

    const lines = columns
      .filter((c) => row[c] !== null && row[c] !== undefined)
      .map((c) => `  • **${stripPrefix(c)}**: ${fmt(row[c])}`)
    return lines.length ? `Resultados:\n${lines.join('\n')}` : 'No hay valores para mostrar.'
  }

  if (/GROUP BY/i.test(sql)) {
    const keyCol = columns[0]
    const valueCol = columns[1]
    const preview = data.slice(0, 5).map((r) => `  • ${r[keyCol]}: ${valueCol ? fmt(r[valueCol]) : '-'}`).join('\n')
    return `Se encontraron **${rowCount}** grupos${note}:\n\n${preview}`
  }

  return `Se encontraron **${rowCount}** registros${note}.`
}
