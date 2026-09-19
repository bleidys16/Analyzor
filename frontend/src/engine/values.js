// Utilidades de valores compartidas por el motor (DuckDB devuelve bigint, fechas, decimales...)

export const quoteIdent = (name) => `"${String(name).replace(/"/g, '""')}"`

export function toNumber(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// Convierte cualquier valor a algo serializable en JSON (sin NaN/Infinity/bigint/Date)
export function jsonSafe(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'bigint') return Number.isSafeInteger(Number(v)) ? Number(v) : v.toString()
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'string' || typeof v === 'boolean') return v
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

// Tipo de DuckDB -> tipo "amigable" que ya consume la UI (integer | float | datetime | boolean | string)
export function friendlyType(duckType) {
  const t = String(duckType).toUpperCase()
  if (/^U?(TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT)$/.test(t)) return 'integer'
  if (t === 'FLOAT' || t === 'DOUBLE' || t === 'REAL' || t.startsWith('DECIMAL')) return 'float'
  if (t === 'DATE' || t.startsWith('TIMESTAMP')) return 'datetime'
  if (t === 'BOOLEAN') return 'boolean'
  return 'string'
}

export const isNumericType = (duckType) => {
  const t = friendlyType(duckType)
  return t === 'integer' || t === 'float'
}

const ID_WORDS = new Set(['id', 'codigo', 'code', 'dni', 'uuid', 'sku', 'key', 'pk', 'llave'])

// "customer_id", "CustomerId" y "Customer Id" son IDs; "Cantidad", "Unidades" o "valid" no.
export function isIdColumn(name) {
  const spaced = String(name).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
  return spaced.split(/[^a-z0-9]+/).some((token) => ID_WORDS.has(token))
}

export function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}
