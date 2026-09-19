// Proxy de IA para Analyzor: oculta la API key de Groq y limita lo que se puede enviar.
//   POST /api/sql     { question, columns, dtypes, sample }                  -> { sql }
//   POST /api/answer  { question, columns, dtypes, sql?, rows?, rows_count? } -> { answer }
//   GET  /health
import { answerMessages, sqlMessages } from './prompts.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
// llama-3.3-70b-versatile fue retirado por Groq el 16/08/2026; ver https://console.groq.com/docs/deprecations
const DEFAULT_MODEL = 'openai/gpt-oss-120b'
const MAX_BODY_BYTES = 16 * 1024
const GROQ_TIMEOUT_MS = 20000
const LIMITS = { question: 500, columns: 100, columnName: 100, rows: 5, sql: 2000 }
const LOCAL_RATE = { limit: 30, windowMs: 60_000 }

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

// --- CORS ---------------------------------------------------------------

function originAllowed(origin, env) {
  if (!origin) return false
  const allowed = String(env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean)
  return allowed.some((rule) => {
    if (!rule.includes('*')) return rule === origin
    const pattern = rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[a-z0-9-]+')
    return new RegExp(`^${pattern}$`).test(origin)
  })
}

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
})

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  })

// --- Rate limit -----------------------------------------------------------
// Usa el binding de Cloudflare si existe (env.RATE_LIMITER); si no, un contador en memoria por isolate.

const hits = new Map()

async function rateLimited(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  if (env.RATE_LIMITER) {
    const { success } = await env.RATE_LIMITER.limit({ key: ip })
    return !success
  }
  const now = Date.now()
  const recent = (hits.get(ip) || []).filter((t) => now - t < LOCAL_RATE.windowMs)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > LOCAL_RATE.limit
}

export const resetRateLimit = () => hits.clear()

// --- Validación -----------------------------------------------------------

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v)

function validate(body, { needsSample }) {
  if (!isPlainObject(body)) throw new HttpError(400, 'Cuerpo inválido')
  const { question, columns, dtypes } = body
  if (typeof question !== 'string' || !question.trim() || question.length > LIMITS.question) {
    throw new HttpError(400, `La pregunta debe tener entre 1 y ${LIMITS.question} caracteres`)
  }
  if (!Array.isArray(columns) || columns.length === 0 || columns.length > LIMITS.columns
    || columns.some((c) => typeof c !== 'string' || c.length > LIMITS.columnName)) {
    throw new HttpError(400, 'columns inválido')
  }
  if (dtypes !== undefined && !isPlainObject(dtypes)) throw new HttpError(400, 'dtypes inválido')

  const rows = needsSample ? body.sample : body.rows
  if (rows !== undefined && (!Array.isArray(rows) || rows.length > LIMITS.rows || rows.some((r) => !isPlainObject(r)))) {
    throw new HttpError(400, `Se aceptan como máximo ${LIMITS.rows} filas de muestra`)
  }
  if (body.sql !== undefined && (typeof body.sql !== 'string' || body.sql.length > LIMITS.sql)) {
    throw new HttpError(400, 'sql inválido')
  }
  return body
}

async function readJson(request) {
  const declared = Number(request.headers.get('Content-Length') || 0)
  if (declared > MAX_BODY_BYTES) throw new HttpError(413, 'Solicitud demasiado grande')
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'Solicitud demasiado grande')
  try {
    return JSON.parse(text)
  } catch {
    throw new HttpError(400, 'JSON inválido')
  }
}

// --- Groq -----------------------------------------------------------------

async function callGroq(env, fetchImpl, messages, { maxTokens, temperature }) {
  if (!env.GROQ_API_KEY) throw new HttpError(503, 'La IA no está configurada')
  const model = env.GROQ_MODEL || DEFAULT_MODEL
  // Los modelos gpt-oss razonan antes de responder: con esfuerzo bajo contestan rápido y gastan menos tokens
  const reasoning = model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}
  let res
  try {
    // LLM_API_URL permite apuntar a otro proveedor compatible con OpenAI (o a un mock en pruebas)
    res = await fetchImpl(env.LLM_API_URL || GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, ...reasoning }),
      signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
    })
  } catch (err) {
    console.error('Groq no respondió:', err?.message)
    throw new HttpError(504, 'El proveedor de IA tardó demasiado')
  }
  if (!res.ok) {
    // Diagnóstico sin secretos: cuerpo, quién respondió y la "forma" de la clave (nunca su valor)
    const key = String(env.GROQ_API_KEY)
    console.error(
      'Groq devolvió', res.status, (await res.text()).slice(0, 300),
      JSON.stringify({
        model,
        contentType: res.headers.get('content-type'),
        server: res.headers.get('server'),
        cfRay: res.headers.get('cf-ray'),
        keyLength: key.length,
        keyLooksValid: /^gsk_[A-Za-z0-9]+$/.test(key),
      })
    )
    throw new HttpError(502, 'El proveedor de IA devolvió un error', { upstream_status: res.status })
  }
  const data = await res.json()
  const content = String(data?.choices?.[0]?.message?.content ?? '').trim()
  if (!content) throw new HttpError(502, 'El proveedor de IA devolvió una respuesta vacía')
  return content
}

// --- Rutas ----------------------------------------------------------------

const ROUTES = {
  '/api/sql': async (body, env, fetchImpl) => {
    const b = validate(body, { needsSample: true })
    return { sql: await callGroq(env, fetchImpl, sqlMessages(b), { maxTokens: 1500, temperature: 0.1 }) }
  },
  '/api/answer': async (body, env, fetchImpl) => {
    const b = validate(body, { needsSample: false })
    return { answer: await callGroq(env, fetchImpl, answerMessages(b), { maxTokens: 1500, temperature: 0.4 }) }
  },
}

export async function handle(request, env, fetchImpl = fetch) {
  const url = new URL(request.url)
  const origin = request.headers.get('Origin')

  if (url.pathname === '/health') return json(200, { status: 'ok' })

  if (!originAllowed(origin, env)) return json(403, { error: 'Origen no permitido' })
  const cors = corsHeaders(origin)

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

  const route = ROUTES[url.pathname]
  if (!route) return json(404, { error: 'No encontrado' }, cors)
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido' }, cors)

  try {
    if (await rateLimited(request, env)) return json(429, { error: 'Demasiadas solicitudes, espera un momento' }, cors)
    const result = await route(await readJson(request), env, fetchImpl)
    return json(200, result, cors)
  } catch (err) {
    if (err instanceof HttpError) return json(err.status, { error: err.message, ...err.extra }, cors)
    console.error('Error inesperado:', err)
    return json(500, { error: 'Error interno' }, cors)
  }
}

export default { fetch: (request, env) => handle(request, env) }
