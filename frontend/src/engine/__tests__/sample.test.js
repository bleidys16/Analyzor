import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { getAnalysis, UploadError } from '../datasetService'
import { sendMessage } from '../chatService'
import { loadSampleDataset } from '../sampleData'
import { setRunnerFactory } from '../session'
import { buildSuggestions } from '../suggestions'
import { datasetStore } from '../store'
import { latestPerDay } from '../../utils/datasets'
import { createNodeRunner } from './nodeRunner'

const csv = readFileSync(new URL('../../../public/ejemplo_ventas.csv', import.meta.url))
const serveSample = vi.fn(async () => new Response(csv, { status: 200 }))
const NO_LLM = { enabled: false }

beforeAll(() => setRunnerFactory(createNodeRunner))

describe('dataset de ejemplo', () => {
  it('carga con las columnas y los tipos esperados', async () => {
    const ds = await loadSampleDataset({ fetchImpl: serveSample })
    expect(ds).toMatchObject({ name: 'ejemplo_ventas', rows_count: 500 })
    expect(ds.columns).toEqual([
      'fecha', 'ciudad', 'categoria', 'producto', 'canal', 'cantidad', 'precio_unitario', 'descuento', 'satisfaccion', 'cliente_id',
    ])
    expect(ds.dtypes).toMatchObject({
      fecha: 'datetime', ciudad: 'string', categoria: 'string', canal: 'string',
      cantidad: 'integer', precio_unitario: 'float', satisfaccion: 'integer', cliente_id: 'integer',
    })
    const analysis = await getAnalysis(ds.id)
    expect(analysis.data_quality.satisfaccion.null_count).toBeGreaterThan(0) // hay datos faltantes a propósito
    expect(analysis.data_quality.ciudad.unique_count).toBe(5)
    expect(JSON.stringify(analysis)).not.toMatch(/NaN|Infinity/)
  })

  it('una segunda vez reutiliza el dataset y no vuelve a descargar', async () => {
    const fetchImpl = vi.fn(serveSample)
    const first = await loadSampleDataset({ fetchImpl: serveSample })
    const second = await loadSampleDataset({ fetchImpl })
    expect(second.id).toBe(first.id)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('si la descarga falla, el error es claro', async () => {
    for (const ds of await datasetStore.list()) await datasetStore.remove(ds.id)
    await expect(loadSampleDataset({ fetchImpl: async () => new Response('', { status: 404 }) })).rejects.toBeInstanceOf(UploadError)
    await expect(loadSampleDataset({ fetchImpl: async () => { throw new TypeError('offline') } })).rejects.toThrow(/conexión/)
  })
})

describe('sugerencias del chat', () => {
  it('se construyen con columnas reales y dejan fuera los IDs', async () => {
    const ds = await loadSampleDataset({ fetchImpl: serveSample })
    const suggestions = buildSuggestions(ds, await getAnalysis(ds.id))
    expect(suggestions).toEqual([
      'Promedio de cantidad por ciudad',
      '¿Cuántos registros hay por ciudad?',
      '¿Cuál es el máximo de precio_unitario?',
      'Suma de cantidad por categoria',
      'Gráfico de torta de ciudad',
      'Muéstrame los primeros datos',
    ])
    expect(suggestions.join(' ')).not.toContain('cliente_id')
  })

  it('CADA sugerencia se responde con el motor de reglas, sin IA', async () => {
    const ds = await loadSampleDataset({ fetchImpl: serveSample })
    for (const question of buildSuggestions(ds, await getAnalysis(ds.id))) {
      const reply = await sendMessage(ds.id, question, { llm: NO_LLM })
      expect(reply.sql_generated, question).toBeTruthy()
      expect(reply.content, question).not.toMatch(/No pude/)
      expect(reply.query_result.data.length, question).toBeGreaterThan(0)
    }
  })

  it('sin datos útiles solo ofrece la pregunta genérica', () => {
    expect(buildSuggestions({ columns: ['id'], dtypes: { id: 'integer' } }, {})).toEqual(['Muéstrame los primeros datos'])
    expect(buildSuggestions(null, null)).toEqual(['Muéstrame los primeros datos'])
  })
})

describe('latestPerDay', () => {
  it('deja solo el más reciente por nombre y día', () => {
    const list = [
      { id: 1, name: 'a', created_at: '2025-01-01T10:00:00Z' },
      { id: 2, name: 'a', created_at: '2025-01-01T12:00:00Z' },
      { id: 3, name: 'a', created_at: '2025-01-02T09:00:00Z' },
    ]
    expect(latestPerDay(list).map((d) => d.id)).toEqual([2, 3])
    expect(latestPerDay(null)).toEqual([])
  })
})
