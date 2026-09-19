import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { getAnalysis, getDataset, deleteDataset, listDatasets, uploadDataset, NotFoundError, UploadError } from '../datasetService'
import { clearHistory, getHistory, sendMessage } from '../chatService'
import { exportPdf } from '../exportService'
import { createLlmClient } from '../llm'
import { setRunnerFactory, MissingFileError, forget, runOnDataset } from '../session'
import { datasetStore } from '../store'
import { createNodeRunner } from './nodeRunner'

const csvFile = (name, text) => new File([text], name, { type: 'text/csv' })
const NO_LLM = { enabled: false }
const fakeLlm = (overrides = {}) => ({
  enabled: true,
  generateSql: async () => 'SELECT COUNT(*) AS total FROM data',
  answer: async () => 'Hay 3 ventas en total.',
  chat: async () => 'Es un dataset de ventas.',
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
    const llm = fakeLlm({ generateSql: async () => '```sql\nSELECT SUM(ventas) AS s FROM data\n```' })
    expect((await sendMessage(ds.id, 'suma', { llm })).sql_generated).toBe('SELECT SUM(ventas) AS s FROM data')
  })

  it('si la IA está caída, cae a las reglas sin error visible', async () => {
    const ds = await uploadDataset(csvFile('chat5.csv', VENTAS))
    const llm = fakeLlm({ generateSql: async () => { throw new Error('boom') } })
    const reply = await sendMessage(ds.id, 'promedio de ventas', { llm })
    expect(reply.content).toContain('20')
  })

  it('si la IA devuelve SQL malicioso, se rechaza y se usan las reglas', async () => {
    const ds = await uploadDataset(csvFile('chat6.csv', VENTAS))
    const llm = fakeLlm({ generateSql: async () => "SELECT * FROM read_text('/etc/passwd')" })
    const reply = await sendMessage(ds.id, 'promedio de ventas', { llm })
    expect(reply.sql_generated).toContain('AVG("ventas")')
  })

  it('si la IA redacta mal, usa el texto de reglas', async () => {
    const ds = await uploadDataset(csvFile('chat7.csv', VENTAS))
    const llm = fakeLlm({ answer: async () => { throw new Error('boom') } })
    expect((await sendMessage(ds.id, 'cuántos hay', { llm })).content).toContain('3')
  })

  it('pregunta que no entiende: charla general con IA, o guía sin IA', async () => {
    const ds = await uploadDataset(csvFile('chat8.csv', VENTAS))
    const unrelated = 'háblame del significado de esta información'
    const llm = fakeLlm({ generateSql: async () => 'Error: cannot generate SQL' })
    expect((await sendMessage(ds.id, unrelated, { llm })).content).toBe('Es un dataset de ventas.')
    expect((await sendMessage(ds.id, unrelated, { llm: NO_LLM })).content).toMatch(/No pude interpretar/)
  })

  it('un dataset inexistente da NotFoundError', async () => {
    await expect(sendMessage('nope', 'hola', { llm: NO_LLM })).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('cliente del proxy de IA', () => {
  it('envía solo esquema y muestra recortada, nunca todos los datos', async () => {
    const calls = []
    const client = createLlmClient({
      baseUrl: 'https://llm.example/',
      fetchImpl: async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) })
        return { ok: true, json: async () => ({ sql: 'SELECT 1' }) }
      },
    })
    const sample = Array.from({ length: 100 }, (_, i) => ({ n: i }))
    expect(await client.generateSql({ question: 'q', columns: ['n'], dtypes: { n: 'integer' }, sample })).toBe('SELECT 1')
    expect(calls[0].url).toBe('https://llm.example/api/sql')
    expect(calls[0].body.sample).toHaveLength(5)
  })

  it('sin URL queda desactivado; un 500 lanza error', async () => {
    expect(createLlmClient({ baseUrl: '' }).enabled).toBe(false)
    const client = createLlmClient({ baseUrl: 'https://x', fetchImpl: async () => ({ ok: false, status: 500 }) })
    await expect(client.chat({ question: 'q', columns: [], dtypes: {} })).rejects.toThrow('500')
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
