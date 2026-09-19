// Prueba de humo contra Groq REAL, usando el mismo código del Worker.
// Uso (la clave solo vive en esa terminal, nunca en un archivo):
//   $env:GROQ_API_KEY = "gsk_..."      (PowerShell)
//   npm run smoke
import { handle } from '../src/index.js'

if (!process.env.GROQ_API_KEY) {
  console.error('Falta GROQ_API_KEY en el entorno. Ver instrucciones al inicio de este archivo.')
  process.exit(1)
}

const env = {
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GROQ_MODEL: process.env.GROQ_MODEL, // opcional: para probar otro modelo
  ALLOWED_ORIGINS: 'http://localhost:5173',
}

const call = async (path, body) => {
  const request = new Request(`https://local.test${path}`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const started = Date.now()
  const res = await handle(request, env)
  return { status: res.status, ms: Date.now() - started, body: await res.json() }
}

const schema = {
  columns: ['fecha', 'ciudad', 'cantidad', 'precio'],
  dtypes: { fecha: 'datetime', ciudad: 'string', cantidad: 'integer', precio: 'float' },
}
const sample = [
  { fecha: '2024-01-05', ciudad: 'Bogota', cantidad: 3, precio: 10.5 },
  { fecha: '2024-02-10', ciudad: 'Cali', cantidad: 5, precio: 20 },
]

const results = []
const check = (name, ok, detail) => {
  results.push(ok)
  console.log(`${ok ? 'OK   ' : 'FALLA'}  ${name}${detail ? ` -> ${detail}` : ''}`)
}

console.log(`Modelo: ${env.GROQ_MODEL || '(por defecto del Worker)'}\n`)

const sql = await call('/api/sql', { question: '¿En qué ciudad se vendió más?', ...schema, sample })
check('POST /api/sql responde 200', sql.status === 200, `${sql.ms} ms`)
console.log('      SQL devuelto:', JSON.stringify(sql.body.sql ?? sql.body))
check('el SQL empieza con SELECT/WITH (tras limpiar ```)', /\b(SELECT|WITH)\b/i.test(sql.body.sql || ''))
check('usa la tabla data', /\bdata\b/i.test(sql.body.sql || ''))

const answer = await call('/api/answer', {
  question: '¿En qué ciudad se vendió más?',
  ...schema,
  sql: 'SELECT ciudad, SUM(cantidad) AS total FROM data GROUP BY ciudad ORDER BY total DESC',
  rows: [{ ciudad: 'Cali', total: 5 }, { ciudad: 'Bogota', total: 3 }],
  rows_count: 2,
})
check('POST /api/answer responde 200', answer.status === 200, `${answer.ms} ms`)
console.log('      Respuesta:', JSON.stringify(answer.body.answer ?? answer.body))
check('la respuesta menciona a Cali', /cali/i.test(answer.body.answer || ''))

const chat = await call('/api/answer', { question: '¿De qué trata este dataset?', ...schema, rows_count: 300 })
check('charla general sin filas (200)', chat.status === 200, chat.body.answer ? `${chat.ms} ms` : JSON.stringify(chat.body))

console.log(`\n${results.filter(Boolean).length}/${results.length} comprobaciones correctas`)
process.exit(results.every(Boolean) ? 0 : 1)
