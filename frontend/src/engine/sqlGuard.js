// Guardia del SQL que llega de la IA o del usuario.
// DuckDB-WASM corre en un sandbox del navegador (sin archivos del servidor), pero igual
// aceptamos solo UNA consulta de lectura para no destruir la tabla `data` ni llamar a red.

const FORBIDDEN_FUNCTIONS = /\b(read_[a-z0-9_]+|write_[a-z0-9_]+|glob|sniff_csv|parquet_[a-z0-9_]+|json_serialize_sql|query|query_table|getenv|current_setting)\s*\(/i

// Reemplaza literales ('..'), identificadores (".."), y comentarios por marcadores vacíos
// para poder inspeccionar solo la estructura del SQL.
function stripLiteralsAndComments(sql) {
  let out = ''
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    const n = sql[i + 1]
    if (c === '-' && n === '-') {
      while (i < sql.length && sql[i] !== '\n') i++
      out += ' '
      continue
    }
    if (c === '/' && n === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      out += ' '
      continue
    }
    if (c === "'" || c === '"') {
      i++
      while (i < sql.length) {
        if (sql[i] === c) {
          if (sql[i + 1] === c) { i += 2; continue }
          break
        }
        i++
      }
      i++
      out += c + c
      continue
    }
    out += c
    i++
  }
  return out
}

// Limpia la respuesta de un LLM: quita ``` y texto alrededor; devuelve null si no hay SELECT/WITH.
export function cleanLlmSql(text) {
  if (!text || typeof text !== 'string') return null
  let sql = text.trim()
  const fenced = sql.match(/```(?:sql)?\s*([\s\S]*?)```/i)
  if (fenced) sql = fenced[1].trim()
  const start = sql.search(/\b(SELECT|WITH)\b/i)
  if (start === -1) return null
  return sql.slice(start).trim()
}

export function validateSelect(rawSql) {
  if (!rawSql || typeof rawSql !== 'string' || !rawSql.trim()) {
    return { ok: false, error: 'La consulta está vacía' }
  }
  if (/\$\$|\bE'/i.test(rawSql)) {
    return { ok: false, error: 'Sintaxis no permitida en la consulta' }
  }

  const code = stripLiteralsAndComments(rawSql).trim().replace(/;+\s*$/, '')
  if (code.includes(';')) {
    return { ok: false, error: 'Solo se permite una consulta a la vez' }
  }
  if (!/^\(*\s*(SELECT|WITH)\b/i.test(code)) {
    return { ok: false, error: 'Solo se permiten consultas SELECT' }
  }
  if (FORBIDDEN_FUNCTIONS.test(code)) {
    return { ok: false, error: 'La consulta usa funciones no permitidas' }
  }

  return { ok: true, sql: rawSql.trim().replace(/;+\s*$/, '') }
}
