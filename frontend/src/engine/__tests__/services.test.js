import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getAnalysis, getDataset, deleteDataset, listDatasets, uploadDataset, NotFoundError, UploadError } from '../datasetService'
import { clearHistory, getHistory, sendMessage } from '../chatService'
import { exportPdf } from '../exportService'
import { LlmLimitError, createLlmClient } from '../llm'
import { setRunnerFactory, MissingFileError, forget, runOnDataset } from '../session'
import { datasetStore } from '../store'
import { createNodeRunner } from './nodeRunner'

const csvFile = (name, text) => new File([text], name, { type: 'text/csv' })
const NO_LLM = { enabled: false }
const fakeLlm = (overrides = {}) => ({
  enabled: true,
  ask: async () => ({ sql: 'SELECT COUNT(*) AS total FROM data' }),
  answer: async () => 'Hay 3 ventas en total.',
  ...overrides,
})

const VENTAS = 'fecha,ciudad,ventas\n2024-01-05,Bogota,10\n2024-02-10,Bogota,20\n2024-03-01,Cali,30\n'

beforeAll(() => setRunnerFactory(createNodeRunner))

describe('subida de datasets', () => {
  it('sube, analiza en el momento y guarda todo', async () => {
    const ds = await uploadDataset(csvFile('ventas.csv', VENTAS))
    expect(ds).toMatchObject({ name: 'ventas', rows_count: 3, columns: ['fecha', 'ciudad', 'ventas'] })
    expect(ds.dtypes).toEqual({ fecha: 'datetime', ciudad: 'string', ventas: 'integer' })
    expect(ds.preview).toHaveLength(3)
    expect(ds.analysis.statistics.ventas.mean).toBe(20)
    expect(await datasetStore.getFile(ds.id)).toBeInstanceOf(Uint8Array)
  })

  it('listar no trae vista previa ni análisis; el detalle sí trae la vista previa', async () => {
    const ds = await uploadDataset(csvFile('lista.csv', VENTAS))
    const listed = (await listDatasets()).find((d) => d.id === ds.id)
    expect(listed.preview).toBeUndefined()
    expect(listed.analysis).toBeUndefined()
    const detail = await getDataset(ds.id)
    expect(detail.preview).toHaveLength(3)
    expect(detail.analysis).toBeUndefined()
  })

  it.each([
    ['no es .csv', csvFile('foto.png', 'x'), /csv/i],
    ['está vacío', csvFile('vacio.csv', ''), /vacío/i],
    ['solo tiene encabezado', csvFile('h.csv', 'a,b,c\n'), /no tiene filas/i],
  ])('rechaza un archivo que %s', async (_n, file, message) => {
    await expect(uploadDataset(file)).rejects.toThrow(message)
    await expect(uploadDataset(file)).rejects.toBeInstanceOf(UploadError)
  })

  it('dos subidas del mismo nombre son datasets distintos (antes se ignoraba la nueva)', async () => {
    const a = await uploadDataset(csvFile('igual.csv', 'a\n1\n'))
    const b = await uploadDataset(csvFile('igual.csv', 'a,b,c\n1,2,3\n'))
    expect(a.id).not.toBe(b.id)
    expect(b.columns).toEqual(['a', 'b', 'c'])
  })
})

describe('análisis', () => {
  it('reconstruye el análisis desde el archivo guardado si falta', async () => {
    const ds = await uploadDataset(csvFile('a.csv', 'a,b\n1,5\n2,5\n3,5\n'))
    await datasetStore.put({ ...(await datasetStore.get(ds.id)), analysis: undefined })
    const analysis = await getAnalysis(ds.id)
    expect(analysis.statistics.a.mean).toBe(2)
    expect((await datasetStore.get(ds.id)).analysis).toBeTruthy()
  })

  it('un dataset inexistente da NotFoundError', async () => {
    await expect(getAnalysis('nope')).rejects.toBeInstanceOf(NotFoundError)
    await expect(getDataset('nope')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('si el archivo desapareció, el error es claro', async () => {
    const ds = await uploadDataset(csvFile('perdido.csv', VENTAS))
    const db = await (await import('idb')).openDB('analyzor')
    await db.delete('files', ds.id)
    db.close()
    forget(ds.id) // como tras recargar la página: el dataset ya no está cargado en DuckDB
    await expect(runOnDataset(ds.id, () => 1)).rejects.toBeInstanceOf(MissingFileError)
  })
})

describe('chat', () => {
  it('sin IA responde con reglas locales, con gráfico y persistiendo el historial', async () => {
    const ds = await uploadDataset(csvFile('chat1.csv', VENTAS))
    const reply = await sendMessage(ds.id, 'promedio de ventas por ciudad', { llm: NO_LLM })
    expect(reply).toMatchObject({ role: 'assistant', dataset_id: ds.id })
    expect(reply.sql_generated).toContain('GROUP BY')
    expect(reply.content).toContain('Bogota')
    expect(reply.query_result.chart.type).toBe('pie')

    const history = await getHistory(ds.id)
    expect(history.map((m) => m.role)).toEqual(['user', 'assistant'])
    await clearHistory(ds.id)
    expect(await getHistory(ds.id)).toEqual([])
  })

  it('"muestra los datos" con columna de fecha ya no rompe', async () => {
    const ds = await uploadDataset(csvFile('chat2.csv', VENTAS))
    const reply = await sendMessage(ds.id, 'muestra los datos', { llm: NO_LLM })
    expect(reply.query_result.data[0].fecha).toBe('2024-01-05')
    expect(reply.query_result.chart.type).toBe('text')
  })

  it('con IA: usa su SQL y su redacción', async () => {
    const ds = await uploadDataset(csvFile('chat3.csv', VENTAS))
    const reply = await sendMessage(ds.id, '¿cuántas ventas hay?', { llm: fakeLlm() })
    expect(reply.sql_generated).toBe('SELECT COUNT(*) AS total FROM data')
    expect(reply.content).toBe('Hay 3 ventas en total.')
  })

  it('el SQL de la IA en un bloque markdown se limpia', async () => {
    const ds = await uploadDataset(csvFile('chat4.csv', VENTAS))
    const llm = fakeLlm({ ask: async () => ({ sql: '```sql\nSELECT SUM(ventas) AS s FROM data\n```' }) })
    expect((await sendMessage(ds.id, 'suma', { llm })).sql_generated).toBe('SELECT SUM(ventas) AS s FROM data')
  })

  it('si la IA está caída, cae a las reglas sin error visible', async () => {
    const ds = await uploadDataset(csvFile('chat5.csv', VENTAS))
    const llm = fakeLlm({ ask: async () => { throw new Error('boom') } })
    const reply = await sendMessage(ds.id, 'promedio de ventas', { llm })
    expect(reply.content).toContain('20')
  })

  it('si la IA devuelve SQL malicioso, se rechaza y se usan las reglas', async () => {
    const ds = await uploadDataset(csvFile('chat6.csv', VENTAS))
    const llm = fakeLlm({ ask: async () => ({ sql: "SELECT * FROM read_text('/etc/passwd')" }) })
    const reply = await sendMessage(ds.id, 'promedio de ventas', { llm })
    expect(reply.sql_generated).toContain('AVG("ventas")')
  })

  it('si la IA redacta mal, usa el texto de reglas', async () => {
    const ds = await uploadDataset(csvFile('chat7.csv', VENTAS))
    const llm = fakeLlm({ answer: async () => { throw new Error('boom') } })
    expect((await sendMessage(ds.id, 'cuántos hay', { llm })).content).toContain('3')
  })

  describe('conversación general (no solo sobre el CSV)', () => {
    const javaQuestion = 'puedes decirme como mostrar hola mundo en java'

    it('un saludo se responde con el texto de la IA, sin números ni consultas', async () => {
      const ds = await uploadDataset(csvFile('charla1.csv', VENTAS))
      const llm = fakeLlm({ ask: async () => ({ answer: '¡Hola! ¿Qué quieres explorar hoy?' }) })
      const reply = await sendMessage(ds.id, 'hola', { llm })
      expect(reply).toMatchObject({ content: '¡Hola! ¿Qué quieres explorar hoy?', sql_generated: null, query_result: null })
    })

    it('pregunta de programación: responde la IA y NO se dispara el motor de reglas (antes daba "50 registros")', async () => {
      const ds = await uploadDataset(csvFile('charla2.csv', VENTAS))
      const answer = vi.fn(async () => 'no debería llamarse')
      const llm = fakeLlm({ ask: async () => ({ answer: 'Así se hace:\n```java\nSystem.out.println("Hola mundo");\n```' }), answer })
      const reply = await sendMessage(ds.id, javaQuestion, { llm })
      expect(reply.content).toContain('System.out.println')
      expect(reply.content).not.toMatch(/registros/)
      expect(reply.sql_generated).toBeNull()
      expect(answer).not.toHaveBeenCalled()
    })

    it('si el modelo responde en texto sin usar el marcador, se muestra como respuesta', async () => {
      const ds = await uploadDataset(csvFile('charla3.csv', VENTAS))
      const llm = fakeLlm({ ask: async () => ({ sql: 'Claro, aquí tienes un chiste: ...' }) })
      expect((await sendMessage(ds.id, 'cuéntame un chiste', { llm })).content).toBe('Claro, aquí tienes un chiste: ...')
    })

    it('una pregunta sobre los datos sigue yendo a SQL aunque la charla esté activa', async () => {
      const ds = await uploadDataset(csvFile('charla4.csv', VENTAS))
      const reply = await sendMessage(ds.id, '¿cuántas ventas hay?', { llm: fakeLlm() })
      expect(reply.sql_generated).toBe('SELECT COUNT(*) AS total FROM data')
    })

    it('la IA recibe los últimos mensajes de la conversación (sin la pregunta actual)', async () => {
      const ds = await uploadDataset(csvFile('charla5.csv', VENTAS))
      const ask = vi.fn(async () => ({ answer: 'ok' }))
      const llm = fakeLlm({ ask })
      await sendMessage(ds.id, 'hola', { llm })
      await sendMessage(ds.id, 'y otro ejemplo?', { llm })
      expect(ask.mock.calls[0][0].history).toEqual([])
      expect(ask.mock.calls[1][0].history).toEqual([
        { role: 'user', content: 'hola' },
        { role: 'assistant', content: 'ok' },
      ])
      expect(ask.mock.calls[1][0]).toMatchObject({ question: 'y otro ejemplo?', rowsCount: 3 })
    })

    it('sin IA, una pregunta ajena a los datos NO devuelve filas al azar: explica qué sí puede hacer', async () => {
      const ds = await uploadDataset(csvFile('charla6.csv', VENTAS))
      const reply = await sendMessage(ds.id, javaQuestion, { llm: NO_LLM })
      expect(reply.content).toMatch(/Sin la IA activada/)
      expect(reply.content).toContain('promedio de fecha')
      expect(reply.query_result).toBeNull()
    })

    it('con la IA caída, una pregunta ajena avisa que no pudo conectar', async () => {
      const ds = await uploadDataset(csvFile('charla7.csv', VENTAS))
      const llm = fakeLlm({ ask: async () => { throw new Error('boom') } })
      const reply = await sendMessage(ds.id, 'hola', { llm })
      expect(reply.content).toMatch(/No pude conectar con la IA/)
    })
  })

  it('un dataset inexistente da NotFoundError', async () => {
    await expect(sendMessage('nope', 'hola', { llm: NO_LLM })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('si la IA alcanzó su límite diario responde con reglas y lo avisa', async () => {
    const ds = await uploadDataset(csvFile('chat9.csv', VENTAS))
    const llm = fakeLlm({ ask: async () => { throw new LlmLimitError('tope', { daily: true }) } })
    const reply = await sendMessage(ds.id, 'promedio de ventas', { llm })
    expect(reply.content).toContain('20') // sigue respondiendo la pregunta
    expect(reply.content).toContain('límite diario')
    expect(reply.sql_generated).toContain('AVG("ventas")')
  })

  it('si pregunta muy rápido (sin tope diario) el aviso es distinto y una charla no se inventa una respuesta', async () => {
    const ds = await uploadDataset(csvFile('chat10.csv', VENTAS))
    const llm = fakeLlm({ ask: async () => { throw new LlmLimitError('rápido') } })
    const reply = await sendMessage(ds.id, 'hola', { llm })
    expect(reply.content).toContain('muy rápido')
    expect(reply.content).toMatch(/solo puedo responder preguntas sobre tus datos|No pude conectar/)
  })
})

describe('cliente del proxy de IA', () => {
  const recorder = (json = { sql: 'SELECT 1' }) => {
    const calls = []
    const fetchImpl = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) })
      return { ok: true, json: async () => json }
    }
    return { calls, client: createLlmClient({ baseUrl: 'https://llm.example/', fetchImpl }) }
  }
  const base = { question: 'q', columns: ['n'], dtypes: { n: 'integer' } }

  it('ask envía solo esquema y muestra recortada, nunca todos los datos', async () => {
    const { calls, client } = recorder()
    const sample = Array.from({ length: 100 }, (_, i) => ({ n: i }))
    expect(await client.ask({ ...base, sample, rowsCount: 300 })).toEqual({ sql: 'SELECT 1' })
    expect(calls[0].url).toBe('https://llm.example/api/ask')
    expect(calls[0].body.sample).toHaveLength(5)
    expect(calls[0].body.rows_count).toBe(300)
  })

  it('ask devuelve la respuesta de charla tal cual', async () => {
    const { client } = recorder({ answer: 'hola!' })
    expect(await client.ask(base)).toEqual({ answer: 'hola!' })
  })

  it('el historial se recorta a los últimos 6 mensajes y 600 caracteres, y descarta roles ajenos', async () => {
    const { calls, client } = recorder()
    const history = [
      { role: 'system', content: 'ignorar' },
      ...Array.from({ length: 8 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}` })),
      { role: 'user', content: 'x'.repeat(2000) },
    ]
    await client.ask({ ...base, history })
    const sent = calls[0].body.history
    expect(sent).toHaveLength(6)
    expect(sent.at(-1).content).toHaveLength(600)
    expect(sent.some((m) => m.role === 'system')).toBe(false)
  })

  it('un 429 del Worker es un LlmLimitError (diario si trae scope)', async () => {
    const respond = (body) => async () => ({ ok: false, status: 429, json: async () => body })
    const daily = createLlmClient({ baseUrl: 'https://x', fetchImpl: respond({ error: 'tope', scope: 'ip' }) })
    const burst = createLlmClient({ baseUrl: 'https://x', fetchImpl: respond({ error: 'rápido' }) })
    await expect(daily.ask(base)).rejects.toMatchObject({ name: 'Error', daily: true, message: 'tope' })
    await expect(burst.ask(base)).rejects.toBeInstanceOf(LlmLimitError)
    await expect(burst.ask(base)).rejects.toMatchObject({ daily: false })
  })

  it('sin URL queda desactivado; un 500 lanza error', async () => {
    expect(createLlmClient({ baseUrl: '' }).enabled).toBe(false)
    const client = createLlmClient({ baseUrl: 'https://x', fetchImpl: async () => ({ ok: false, status: 500 }) })
    await expect(client.ask({ question: 'q', columns: [], dtypes: {} })).rejects.toThrow('500')
  })
})

describe('exportar PDF', () => {
  it('genera un PDF válido aunque haya "&", "<", desviación nula, o caracteres raros', async () => {
    const ds = await uploadDataset(csvFile('raro.csv', 'Sales & Marketing,<5 años,valor\nñandú,€,5\n'))
    const blob = await exportPdf(ds.id)
    const header = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('genera un PDF con un dataset completo', async () => {
    const ds = await uploadDataset(csvFile('completo.csv', VENTAS))
    expect((await exportPdf(ds.id)).size).toBeGreaterThan(2000)
  })
})

describe('borrado', () => {
  it('elimina dataset, archivo y mensajes', async () => {
    const ds = await uploadDataset(csvFile('borrar.csv', VENTAS))
    await sendMessage(ds.id, 'muestra los datos', { llm: NO_LLM })
    await deleteDataset(ds.id)
    expect(await datasetStore.get(ds.id)).toBeUndefined()
    expect(await datasetStore.getFile(ds.id)).toBeUndefined()
    expect(await getHistory(ds.id)).toEqual([])
  })
})
