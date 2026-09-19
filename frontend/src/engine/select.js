import { validateSelect } from './sqlGuard'
import { jsonSafe, quoteIdent } from './values'

export const MAX_RESULT_ROWS = 1000

// Tipos que salen del runner como number/string/boolean tal cual; el resto se castea en SQL
const PASSTHROUGH = /^(BOOLEAN|U?TINYINT|U?SMALLINT|U?INTEGER|U?BIGINT|FLOAT|DOUBLE|VARCHAR)$/

function projectionFor(column) {
  const id = quoteIdent(column.column_name)
  const type = String(column.column_type).toUpperCase()
  if (PASSTHROUGH.test(type)) return id
  if (type.startsWith('DECIMAL') || type === 'HUGEINT' || type === 'UHUGEINT') {
    return `CAST(${id} AS DOUBLE) AS ${id}`
  }
  // fechas, timestamps, listas, structs, UUID, blobs...
  return `CAST(${id} AS VARCHAR) AS ${id}`
}

// Ejecuta un SELECT validado sobre la tabla `data`.
// Devuelve siempre { columns, data, row_count, truncated, execution_time, error } con valores JSON-safe.
export async function runSelect(runner, sql, { limit = MAX_RESULT_ROWS } = {}) {
  const empty = { columns: [], data: [], row_count: 0, truncated: false, execution_time: 0, error: null }
  const check = validateSelect(sql)
  if (!check.ok) return { ...empty, error: check.error }

  const start = performance.now()
  try {
    const described = await runner.query(`DESCRIBE ${check.sql}`)
    const columns = described.rows.map((r) => r.column_name)
    const projection = described.rows.map(projectionFor).join(', ')
    // El salto de línea evita que un comentario final (-- ...) se coma el paréntesis
    const result = await runner.query(
      `SELECT ${projection} FROM (\n${check.sql}\n) LIMIT ${limit + 1}`
    )
    const truncated = result.rows.length > limit
    const rows = truncated ? result.rows.slice(0, limit) : result.rows
    const data = rows.map((row) => {
      const out = {}
      for (const col of columns) out[col] = jsonSafe(row[col])
      return out
    })
    return {
      columns,
      data,
      row_count: data.length,
      truncated,
      execution_time: performance.now() - start,
      error: null,
    }
  } catch (err) {
    return { ...empty, execution_time: performance.now() - start, error: cleanDuckError(err) }
  }
}

export function cleanDuckError(err) {
  const msg = String(err?.message || err || 'Error desconocido')
  return msg.replace(/^(Binder|Parser|Catalog|Conversion|Invalid Input|Constraint|IO|Out of Range) Error:\s*/i, '').split('\n')[0]
}
