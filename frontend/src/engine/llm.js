// Cliente del proxy de IA (Cloudflare Worker). La API key de Groq vive solo en el Worker.
// Sin VITE_LLM_URL la IA queda desactivada y el chat usa el motor de reglas.
const TIMEOUT_MS = 25000
const SAMPLE_ROWS = 5
const MAX_COLUMNS = 60

// El Worker responde 429 al superar el tope diario (daily = true) o al preguntar demasiado rápido
export class LlmLimitError extends Error {
  constructor(message, { daily = false } = {}) {
    super(message)
    this.daily = daily
  }
}

export function createLlmClient({ baseUrl = import.meta.env?.VITE_LLM_URL || '', fetchImpl } = {}) {
  const base = String(baseUrl).replace(/\/+$/, '')

  async function post(path, body) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await (fetchImpl || fetch)(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (res.status === 429) {
        const detail = await res.json().catch(() => ({}))
        throw new LlmLimitError(detail.error || 'Límite de uso de la IA alcanzado', { daily: Boolean(detail.scope) })
      }
      if (!res.ok) throw new Error(`El servicio de IA respondió ${res.status}`)
      return await res.json()
    } finally {
      clearTimeout(timer)
    }
  }

  // Solo se envía el esquema y unas pocas filas de muestra, nunca el dataset completo
  const context = ({ columns, dtypes, sample }) => ({
    columns: columns.slice(0, MAX_COLUMNS),
    dtypes,
    sample: (sample || []).slice(0, SAMPLE_ROWS),
  })

  return {
    enabled: Boolean(base),
    generateSql: async (ctx) => (await post('/api/sql', { question: ctx.question, ...context(ctx) })).sql,
    answer: async (ctx) =>
      (await post('/api/answer', {
        question: ctx.question,
        ...context(ctx),
        sql: ctx.sql,
        rows: (ctx.rows || []).slice(0, SAMPLE_ROWS),
        rows_count: ctx.rowsCount,
      })).answer,
    chat: async (ctx) =>
      (await post('/api/answer', { question: ctx.question, ...context(ctx), rows_count: ctx.rowsCount })).answer,
  }
}

export const defaultLlm = createLlmClient()
