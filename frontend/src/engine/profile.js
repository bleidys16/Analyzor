import { describeTable } from './csv'
import { runSelect } from './select'
import { chunk, quoteIdent, toNumber } from './values'

const COLUMNS_PER_QUERY = 15
const MAX_CORRELATION_COLUMNS = 40
const PREVIEW_ROWS = 100

const pct = (part, total) => (total ? (part / total) * 100 : 0)

// Estadísticas, calidad, correlaciones y anomalías de la tabla `data`.
// Misma forma que devolvía el backend: { statistics, correlations, data_quality, anomalies }
export async function profileTable(runner, schema = null) {
  const columns = schema || (await describeTable(runner))
  const totalRow = await runner.query('SELECT count(*) AS n FROM data')
  const total = toNumber(totalRow.rows[0].n) || 0

  const statistics = {}
  const dataQuality = {}

  for (const batch of chunk(columns, COLUMNS_PER_QUERY)) {
    const exprs = []
    batch.forEach((col, i) => {
      const q = quoteIdent(col.name)
      exprs.push(`count(*) - count(${q}) AS nulls_${i}`, `count(DISTINCT ${q}) AS uniq_${i}`)
      if (col.numeric) {
        const d = `CAST(${q} AS DOUBLE)`
        exprs.push(
          `avg(${d}) AS mean_${i}`,
          `median(${d}) AS median_${i}`,
          `stddev_samp(${d}) AS std_${i}`,
          `min(${d}) AS min_${i}`,
          `max(${d}) AS max_${i}`,
          `quantile_cont(${d}, 0.25) AS q25_${i}`,
          `quantile_cont(${d}, 0.75) AS q75_${i}`
        )
      } else {
        exprs.push(`CAST(mode(${q}) AS VARCHAR) AS mode_${i}`)
      }
    })
    const row = (await runner.query(`SELECT ${exprs.join(', ')} FROM data`)).rows[0]

    batch.forEach((col, i) => {
      const nulls = toNumber(row[`nulls_${i}`]) || 0
      const unique = toNumber(row[`uniq_${i}`]) || 0
      const nullPct = pct(nulls, total)

      dataQuality[col.name] = {
        dtype: col.dtype,
        unique_count: unique,
        null_count: nulls,
        null_pct: nullPct,
        cardinality: pct(unique, total),
      }

      if (col.numeric) {
        statistics[col.name] = {
          mean: toNumber(row[`mean_${i}`]),
          median: toNumber(row[`median_${i}`]),
          std: toNumber(row[`std_${i}`]),
          min: toNumber(row[`min_${i}`]),
          max: toNumber(row[`max_${i}`]),
          q25: toNumber(row[`q25_${i}`]),
          q75: toNumber(row[`q75_${i}`]),
          null_count: nulls,
          null_pct: nullPct,
        }
      } else {
        const mode = row[`mode_${i}`]
        statistics[col.name] = {
          unique,
          most_common: mode === null || mode === undefined ? null : String(mode),
          null_count: nulls,
          null_pct: nullPct,
        }
      }
    })
  }

  return {
    statistics,
    correlations: await correlations(runner, columns),
    data_quality: dataQuality,
    anomalies: detectAnomalies(dataQuality, total),
  }
}

async function correlations(runner, columns) {
  const numeric = columns.filter((c) => c.numeric).slice(0, MAX_CORRELATION_COLUMNS)
  if (numeric.length < 2) return {}

  const exprs = []
  for (let i = 0; i < numeric.length; i++) {
    for (let j = i + 1; j < numeric.length; j++) {
      const a = `CAST(${quoteIdent(numeric[i].name)} AS DOUBLE)`
      const b = `CAST(${quoteIdent(numeric[j].name)} AS DOUBLE)`
      exprs.push(`corr(${a}, ${b}) AS c_${i}_${j}`)
    }
  }
  const stds = numeric.map((c, i) => `stddev_samp(CAST(${quoteIdent(c.name)} AS DOUBLE)) AS s_${i}`)
  const row = (await runner.query(`SELECT ${[...exprs, ...stds].join(', ')} FROM data`)).rows[0]

  const matrix = {}
  numeric.forEach((a, i) => {
    matrix[a.name] = {}
    numeric.forEach((b, j) => {
      if (i === j) {
        const std = toNumber(row[`s_${i}`])
        matrix[a.name][b.name] = std && std > 0 ? 1 : null
      } else {
        const [lo, hi] = i < j ? [i, j] : [j, i]
        matrix[a.name][b.name] = toNumber(row[`c_${lo}_${hi}`])
      }
    })
  })
  return matrix
}

function detectAnomalies(dataQuality, total) {
  const anomalies = []
  for (const [col, q] of Object.entries(dataQuality)) {
    if (q.null_pct > 50) {
      anomalies.push({
        type: 'high_missing',
        column: col,
        value: q.null_pct,
        message: `Columna "${col}" tiene ${q.null_pct.toFixed(1)}% de valores nulos`,
      })
    }
  }
  for (const [col, q] of Object.entries(dataQuality)) {
    if (total > 0 && q.cardinality < 1) {
      anomalies.push({
        type: 'low_cardinality',
        column: col,
        value: q.cardinality,
        message: `Columna "${col}" tiene muy pocos valores únicos`,
      })
    }
  }
  return anomalies
}

export async function previewRows(runner) {
  const res = await runSelect(runner, 'SELECT * FROM data', { limit: PREVIEW_ROWS })
  return res.data
}
