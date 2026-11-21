import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadCsv } from '../csv'
import { profileTable } from '../profile'
import { buildAutoCharts } from '../autoCharts'
import { createNodeRunner, csvBytes } from './nodeRunner'

let runner
beforeAll(async () => { runner = await createNodeRunner() })
afterAll(async () => { await runner.close() })

describe('buildAutoCharts', () => {
  it('grafica la columna categórica de baja cardinalidad y la correlación más fuerte', async () => {
    const rows = Array.from({ length: 40 }, (_, i) => {
      const categoria = i % 3 === 0 ? 'A' : 'B'
      const precio = 10 + i
      const cantidad = precio * 2 // perfectamente correlacionado
      return `${categoria},${precio},${cantidad}`
    })
    const { schema } = await loadCsv(runner, csvBytes('categoria,precio,cantidad\n' + rows.join('\n')))
    const analysis = await profileTable(runner, schema)

    const charts = await buildAutoCharts(runner, analysis)

    expect(charts.length).toBe(2)
    const [catChart, numChart] = charts
    expect(catChart.type).toBe('bar')
    expect(catChart.data.map((d) => d.name).sort()).toEqual(['A', 'B'])
    expect(numChart.type).toBe('scatter')
    expect(numChart.data.length).toBeGreaterThan(0)
  })

  it('cae a un histograma cuando no hay correlacion fuerte ni columna categorica interesante', async () => {
    // valor oscila sin tendencia con id: correlación cercana a 0, no supera el umbral
    const rows = Array.from({ length: 30 }, (_, i) => `${i},${(i * 37) % 97}`)
    const { schema } = await loadCsv(runner, csvBytes('id,valor\n' + rows.join('\n')))
    const analysis = await profileTable(runner, schema)

    const charts = await buildAutoCharts(runner, analysis)

    // "id" es columna numérica con 30 valores únicos sobre 30 filas: no hay categórica que graficar,
    // y sin correlación fuerte el fallback es el histograma de la primera columna numérica (id)
    expect(charts.length).toBe(1)
    expect(charts[0].type).toBe('histogram')
  })

  it('no revienta cuando no hay ninguna columna numerica ni categorica util', async () => {
    const { schema } = await loadCsv(runner, csvBytes('nombre\nAna\n'))
    const analysis = await profileTable(runner, schema)

    const charts = await buildAutoCharts(runner, analysis)
    expect(charts).toEqual([])
  })
})
