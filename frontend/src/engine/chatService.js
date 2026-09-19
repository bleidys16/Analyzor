import { detectChartType } from './chartGenerator'
import { generateFallbackAnswer, generateFallbackSql } from './fallbackSql'
import { defaultLlm } from './llm'
import { runOnDataset } from './session'
import { runSelect } from './select'
import { cleanLlmSql } from './sqlGuard'
import { datasetStore } from './store'
import { NotFoundError } from './datasetService'

const STORED_ROWS = 100
const ANSWER_ROWS = 5

const guidance = (columns) =>
  'No pude interpretar la pregunta. Prueba con algo como «promedio de ' +
  `${columns[0] ?? 'columna'}», «cuántos por ${columns[1] ?? columns[0] ?? 'columna'}» o «muestra los datos».`

// Intenta SQL de la IA; si falla o no hay IA, las reglas locales. Devuelve el primer intento que ejecuta bien.
async function findQuery(runner, meta, question, llm) {
  const { columns, dtypes } = meta
  if (llm.enabled) {
    try {
      const sql = cleanLlmSql(await llm.generateSql({ question, columns, dtypes, sample: meta.preview }))
      if (sql) {
        const result = await runSelect(runner, sql)
        if (!result.error) return { sql, result, viaRules: false }
      }
    } catch (err) {
      console.warn('La IA no pudo generar SQL, uso reglas locales:', err.message)
    }
  }

  const sql = generateFallbackSql(question, columns, dtypes)
  if (!sql) return null
  const result = await runSelect(runner, sql)
  return result.error ? { error: result.error } : { sql, result, viaRules: true }
}

async function explain(meta, question, found, llm) {
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
      console.warn('La IA no pudo redactar la respuesta:', err.message)
    }
  }
  return generateFallbackAnswer(question, result, sql)
}

async function generalChat(meta, question, llm) {
  if (llm.enabled) {
    try {
      const answer = await llm.chat({
        question,
        columns: meta.columns,
        dtypes: meta.dtypes,
        sample: meta.preview,
        rowsCount: meta.rows_count,
      })
      if (answer) return answer
    } catch (err) {
      console.warn('La IA no respondió:', err.message)
    }
  }
  return guidance(meta.columns)
}

export async function sendMessage(datasetId, content, { llm = defaultLlm } = {}) {
  const meta = await datasetStore.get(datasetId)
  if (!meta) throw new NotFoundError('Dataset no encontrado')
  const question = String(content || '').trim()
  if (!question) throw new Error('El mensaje está vacío')

  await datasetStore.addMessage({ dataset_id: datasetId, role: 'user', content: question, created_at: new Date().toISOString() })

  let reply
  try {
    reply = await runOnDataset(datasetId, async (runner) => {
      const found = await findQuery(runner, meta, question, llm)
      if (found?.result) {
        const { result, sql } = found
        return {
          content: await explain(meta, question, found, llm),
          sql_generated: sql,
          query_result: {
            data: result.data.slice(0, STORED_ROWS),
            columns: result.columns,
            chart: detectChartType(result.data, result.columns, { listing: /^\s*SELECT\s+\*/i.test(sql) }),
          },
        }
      }
      if (found?.error) return { content: `No pude ejecutar la consulta: ${found.error}`, sql_generated: null, query_result: null }
      return { content: await generalChat(meta, question, llm), sql_generated: null, query_result: null }
    })
  } catch (err) {
    reply = { content: `Error al analizar: ${err.message}`, sql_generated: null, query_result: null }
  }

  return datasetStore.addMessage({
    dataset_id: datasetId,
    role: 'assistant',
    created_at: new Date().toISOString(),
    ...reply,
  })
}

export const getHistory = (datasetId) => datasetStore.listMessages(datasetId)
export const clearHistory = (datasetId) => datasetStore.clearMessages(datasetId)
