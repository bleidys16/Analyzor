import { detectChartType } from './chartGenerator'
import { generateFallbackAnswer, generateFallbackSql } from './fallbackSql'
import { LlmLimitError, defaultLlm } from './llm'
import { runOnDataset } from './session'
import { runSelect } from './select'
import { cleanLlmSql } from './sqlGuard'
import { datasetStore } from './store'
import { NotFoundError } from './datasetService'

const STORED_ROWS = 100
const ANSWER_ROWS = 5
const HISTORY_MESSAGES = 6

const EXAMPLES = (columns) =>
  `«promedio de ${columns[0] ?? 'columna'}», «cuántos por ${columns[1] ?? columns[0] ?? 'columna'}» o «muestra los datos»`

// Sin IA (no configurada, caída o sin cupo) solo se pueden responder preguntas sobre los datos
const guidance = (columns, { aiDown }) =>
  aiDown
    ? `No pude conectar con la IA en este momento. Mientras tanto puedo responder preguntas sobre tus datos, como ${EXAMPLES(columns)}.`
    : `Sin la IA activada solo puedo responder preguntas sobre tus datos, como ${EXAMPLES(columns)}.`

// Si la IA alcanza su límite de uso se sigue respondiendo con reglas, y se avisa al usuario
const limitNotice = (limit) =>
  limit.daily
    ? 'ℹ️ Alcanzaste el límite diario de preguntas con IA; respondí con el motor de reglas básico. Vuelve mañana para usar la IA.'
    : 'ℹ️ Estás preguntando muy rápido; respondí con el motor de reglas básico. Espera un momento para volver a usar la IA.'

// Anota por qué la IA no se pudo usar en esta pregunta (ctx vive solo durante un sendMessage)
function noteLlmError(err, ctx, what) {
  if (err instanceof LlmLimitError) {
    ctx.limit = err
  } else {
    ctx.aiDown = true
    console.warn(`La IA no pudo ${what}:`, err.message)
  }
}

// Texto que no es SQL ni un error del modelo: se muestra tal cual como respuesta
const isProse = (text) => typeof text === 'string' && text.trim() && !/^error\b/i.test(text.trim())

// La IA decide si es una consulta a los datos (SQL) o una conversación (texto).
// Solo si no hay IA, o falla, se recurre a las reglas locales.
async function findAnswer(runner, meta, question, llm, ctx) {
  const { columns, dtypes } = meta
  if (llm.enabled) {
    try {
      const reply = await llm.ask({
        question,
        columns,
        dtypes,
        sample: meta.preview,
        rowsCount: meta.rows_count,
        history: ctx.history,
      })
      if (reply.answer) return { chat: reply.answer }

      const sql = cleanLlmSql(reply.sql)
      if (sql) {
        const result = await runSelect(runner, sql)
        if (!result.error) return { sql, result, viaRules: false }
      } else if (isProse(reply.sql)) {
        return { chat: reply.sql.trim() } // el modelo respondió en texto sin usar el marcador
      }
    } catch (err) {
      noteLlmError(err, ctx, 'responder')
    }
  }

  const sql = generateFallbackSql(question, columns, dtypes)
  if (!sql) return null
  const result = await runSelect(runner, sql)
  return result.error ? { error: result.error } : { sql, result, viaRules: true }
}

async function explain(meta, question, found, llm, ctx) {
  const { sql, result, viaRules } = found
  if (!viaRules) {
    try {
      const answer = await llm.answer({
        question,
        columns: meta.columns,
        dtypes: meta.dtypes,
        sql,
        rows: result.data.slice(0, ANSWER_ROWS),
        rowsCount: result.row_count,
      })
      if (answer) return answer
    } catch (err) {
      noteLlmError(err, ctx, 'redactar la respuesta')
    }
  }
  return generateFallbackAnswer(question, result, sql)
}

const textReply = (content) => ({ content, sql_generated: null, query_result: null })

export async function sendMessage(datasetId, content, { llm = defaultLlm } = {}) {
  const meta = await datasetStore.get(datasetId)
  if (!meta) throw new NotFoundError('Dataset no encontrado')
  const question = String(content || '').trim()
  if (!question) throw new Error('El mensaje está vacío')

  // La conversación previa da contexto a la IA ("y otro ejemplo?"); se toma antes de guardar la pregunta actual
  const history = (await datasetStore.listMessages(datasetId))
    .slice(-HISTORY_MESSAGES)
    .map(({ role, content: text }) => ({ role, content: text }))

  await datasetStore.addMessage({ dataset_id: datasetId, role: 'user', content: question, created_at: new Date().toISOString() })

  const ctx = { limit: null, aiDown: false, history }
  let reply
  try {
    reply = await runOnDataset(datasetId, async (runner) => {
      const found = await findAnswer(runner, meta, question, llm, ctx)
      if (found?.chat) return textReply(found.chat)
      if (found?.result) {
        const { result, sql } = found
        return {
          content: await explain(meta, question, found, llm, ctx),
          sql_generated: sql,
          query_result: {
            data: result.data.slice(0, STORED_ROWS),
            columns: result.columns,
            chart: detectChartType(result.data, result.columns, { listing: /^\s*SELECT\s+\*/i.test(sql) }),
          },
        }
      }
      if (found?.error) return textReply(`No pude ejecutar la consulta: ${found.error}`)
      return textReply(guidance(meta.columns, { aiDown: ctx.aiDown }))
    })
  } catch (err) {
    reply = textReply(`Error al analizar: ${err.message}`)
  }

  if (ctx.limit) reply.content = `${reply.content}\n\n${limitNotice(ctx.limit)}`

  return datasetStore.addMessage({
    dataset_id: datasetId,
    role: 'assistant',
    created_at: new Date().toISOString(),
    ...reply,
  })
}

export const getHistory = (datasetId) => datasetStore.listMessages(datasetId)
export const clearHistory = (datasetId) => datasetStore.clearMessages(datasetId)
