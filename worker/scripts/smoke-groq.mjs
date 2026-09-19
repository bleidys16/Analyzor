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
  sample: [
    { fecha: '2024-01-05', ciudad: 'Bogota', cantidad: 3, precio: 10.5 },
    { fecha: '2024-02-10', ciudad: 'Cali', cantidad: 5, precio: 20 },
  ],
  rows_count: 300,
}
const ask = (question, history) => call('/api/ask', { question, ...schema, ...(history ? { history } : {}) })

let passed = 0
let total = 0
const show = (label, body) => console.log(`      ${label}:`, JSON.stringify(body ?? '').slice(0, 220))
const check = (name, ok, detail) => {
  total++
  if (ok) passed++
  console.log(`${ok ? 'OK   ' : 'FALLA'}  ${name}${detail ? ` -> ${detail}` : ''}`)
}

console.log(`Modelo: ${env.GROQ_MODEL || '(por defecto del Worker)'}\n`)

console.log('1) Pregunta sobre los datos -> debe devolver SQL')
const data = await ask('¿En qué ciudad se vendió más?')
show('respuesta', data.body.sql ?? data.body.answer ?? data.body)
check('responde 200', data.status === 200, `${data.ms} ms`)
check('devuelve SQL (no charla)', /\b(SELECT|WITH)\b/i.test(data.body.sql || '') && !data.body.answer)
check('usa la tabla data', /\bdata\b/i.test(data.body.sql || ''))

console.log('\n2) Saludo -> debe ser CHARLA, no "no tengo datos numéricos"')
const hello = await ask('hola')
show('respuesta', hello.body.answer ?? hello.body)
check('responde 200 con texto', hello.status === 200 && typeof hello.body.answer === 'string' && !hello.body.sql, `${hello.ms} ms`)
check('no dice que le faltan datos', !/no dispongo|datos num[eé]ricos/i.test(hello.body.answer || ''))

console.log('\n3) Programación (el caso que fallaba) -> debe responder con código')
const java = await ask('puedes decirme como mostrar hola mundo en java')
show('respuesta', java.body.answer ?? java.body)
check('responde con texto, no con SQL', java.status === 200 && Boolean(java.body.answer) && !java.body.sql, `${java.ms} ms`)
check('incluye System.out.println', /System\.out\.println/.test(java.body.answer || ''))
check('trae un bloque de código', /```/.test(java.body.answer || ''))

console.log('\n4) Pregunta sobre el propio dataset -> charla que conoce el esquema')
const about = await ask('¿qué columnas tiene mi dataset y de qué crees que trata?')
show('respuesta', about.body.answer ?? about.body)
check('responde con texto', about.status === 200 && Boolean(about.body.answer), `${about.ms} ms`)
check('menciona alguna columna', /ciudad|precio|cantidad|fecha/i.test(about.body.answer || ''))

console.log('\n5) Seguimiento con memoria de la conversación')
const followUp = await ask('ahora dámelo en Python', [
  { role: 'user', content: 'puedes decirme como mostrar hola mundo en java' },
  { role: 'assistant', content: 'Claro: System.out.println("Hola mundo");' },
])
show('respuesta', followUp.body.answer ?? followUp.body)
check('entiende el contexto: da el Hola mundo en Python', followUp.status === 200 && /print\s*\(\s*["']Hola/i.test(followUp.body.answer || ''), `${followUp.ms} ms`)
check('no lo confunde con los datos del dataset (pandas)', !/pandas|dataframe/i.test(followUp.body.answer || ''))

console.log('\n6) Redactar el resultado de una consulta')
const answer = await call('/api/answer', {
  question: '¿En qué ciudad se vendió más?',
  ...schema,
  sql: 'SELECT ciudad, SUM(cantidad) AS total FROM data GROUP BY ciudad ORDER BY total DESC',
  rows: [{ ciudad: 'Cali', total: 5 }, { ciudad: 'Bogota', total: 3 }],
  rows_count: 2,
})
show('respuesta', answer.body.answer ?? answer.body)
check('menciona a Cali', answer.status === 200 && /cali/i.test(answer.body.answer || ''), `${answer.ms} ms`)

console.log(`\n${passed}/${total} comprobaciones correctas`)
process.exit(passed === total ? 0 : 1)
