import { friendlyType, isNumericType } from './values'

const FILE_NAME = 'upload.csv'

export class CsvError extends Error {}

// Devuelve los bytes en UTF-8. Los CSV de Excel en español suelen venir en Windows-1252.
export function toUtf8(bytes) {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return bytes
  } catch {
    return new TextEncoder().encode(new TextDecoder('windows-1252').decode(bytes))
  }
}

function friendlyCsvError(err) {
  const msg = String(err?.message || err)
  if (/no columns|empty|could not (?:detect|determine)|no rows/i.test(msg)) {
    return 'El archivo está vacío o no parece un CSV válido'
  }
  return `No se pudo leer el CSV: ${msg.replace(/^[A-Za-z ]+ Error:\s*/, '').split('\n')[0]}`
}

export async function describeTable(runner, table = 'data') {
  const { rows } = await runner.query(`DESCRIBE ${table}`)
  return rows.map((r) => ({
    name: r.column_name,
    type: String(r.column_type),
    dtype: friendlyType(r.column_type),
    numeric: isNumericType(r.column_type),
  }))
}

const countNumeric = (schema) => schema.filter((c) => c.numeric).length

async function createTable(runner, table, options) {
  await runner.query(`DROP TABLE IF EXISTS ${table}`)
  await runner.query(`CREATE TABLE ${table} AS SELECT * FROM read_csv('${FILE_NAME}'${options})`)
}

// Carga los bytes de un CSV en la tabla `data`.
// Detecta separador y tipos; reintenta con un muestreo completo y, como último recurso, todo como texto.
// Si hay columnas de texto y el separador no es coma, prueba también la coma decimal (12,5).
export async function loadCsv(runner, rawBytes) {
  const bytes = toUtf8(rawBytes)
  if (bytes.length === 0) throw new CsvError('El archivo está vacío')

  await runner.registerFile(FILE_NAME, bytes)
  try {
    let lastError = null
    let allVarchar = false
    for (const options of ['', ', sample_size=-1', ', all_varchar=true']) {
      try {
        await createTable(runner, 'data', options)
        allVarchar = options.includes('all_varchar')
        lastError = null
        break
      } catch (err) {
        lastError = err
      }
    }
    if (lastError) throw new CsvError(friendlyCsvError(lastError))

    let schema = await describeTable(runner)
    if (!allVarchar && schema.some((c) => c.type === 'VARCHAR')) {
      try {
        await createTable(runner, 'data_alt', ", decimal_separator=','")
        const alt = await describeTable(runner, 'data_alt')
        if (countNumeric(alt) > countNumeric(schema)) {
          await runner.query('DROP TABLE data')
          await runner.query('ALTER TABLE data_alt RENAME TO data')
          schema = alt
        }
      } catch {
        // coma como separador y decimal a la vez: no aplica
      } finally {
        await runner.query('DROP TABLE IF EXISTS data_alt')
      }
    }

    const count = await runner.query('SELECT count(*) AS n FROM data')
    return { schema, rowsCount: Number(count.rows[0].n) }
  } finally {
    await runner.dropFile(FILE_NAME)
  }
}
