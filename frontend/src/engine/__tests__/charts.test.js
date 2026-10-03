import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { detectChartType, parseChartRequest } from '../chartGenerator'
import { sendMessage } from '../chatService'
import { uploadDataset } from '../datasetService'
import { generateFallbackSql } from '../fallbackSql'
import { setRunnerFactory } from '../session'
import { buildSuggestions } from '../suggestions'
import { createNodeRunner } from './nodeRunner'

const NO_LLM = { enabled: false }
const csvFile = (name, text) => new File([text], name, { type: 'text/csv' })

// El CSV de la captura de pantalla que reportó el bug
const PLANETAS = [
  'planeta,tipo,diametro_km,distancia_al_sol_millones_km,periodo_orbital_dias,lunas_conocidas',
  'Mercurio,Rocoso,4879,57.9,88,0',
  'Venus,Rocoso,12104,108.2,225,0',
  'Tierra,Rocoso,12756,149.6,365,1',
  'Marte,Rocoso,6792,227.9,687,2',
  'Júpiter,Gigante gaseoso,142984,778.6,4333,95',
].join('\n') + '\n'

const VENTAS = [
  'fecha,ciudad,cantidad',
  '2025-01-05,Bogota,3', '2025-01-20,Cali,5',
  '2025-02-03,Bogota,4', '2025-02-18,Cali,6',
  '2025-03-09,Bogota,10', '2025-03-25,Cali,2',
].join('\n') + '\n'

beforeAll(() => setRunnerFactory(createNodeRunner))

describe('parseChartRequest', () => {
  it.each([
    ['dámelo en barras', 'bar'],
    ['un gráfico de barras de las ventas', 'bar'],
    ['hazlo en torta', 'pie'],
    ['muéstralo como dona', 'pie'],
    ['gráfico de líneas de las ventas', 'line'],
    ['la evolución de las ventas', 'line'],
    ['una tendencia mensual', 'line'],
    ['haz un histograma de edad', 'histogram'],
    ['un diagrama de dispersión de peso y altura', 'scatter'],
  ])('"%s" -> %s', (question, expected) => expect(parseChartRequest(question)).toBe(expected))

  it('sin tipo, o con palabras que se parecen pero no lo son, devuelve null', () => {
    expect(parseChartRequest('haz un gráfico de las lunas por planeta')).toBeNull()
    expect(parseChartRequest('¿qué columnas tiene el dataset?')).toBeNull() // "columnas" no significa barras
    expect(parseChartRequest('el piedra papel o tijera')).toBeNull()
    expect(parseChartRequest('')).toBeNull()
    expect(parseChartRequest(null)).toBeNull()
  })

  it('si pide varios gana el primero que menciona', () => {
    expect(parseChartRequest('primero en barras y luego en torta')).toBe('bar')
    expect(parseChartRequest('en torta, no en barras')).toBe('pie')
  })
})

describe('detectChartType: líneas para series de tiempo', () => {
  const months = [
    { mes: '2025-03', total: 8 },
    { mes: '2025-01', total: 3 },
    { mes: '2025-02', total: 9 },
  ]

  it('una columna de fechas y una numérica -> línea, ordenada por fecha', () => {
    const chart = detectChartType(months, ['mes', 'total'])
    expect(chart.type).toBe('line')
    expect(chart.data.map((p) => p.name)).toEqual(['2025-01', '2025-02', '2025-03'])
    expect(chart.data.map((p) => p.value)).toEqual([3, 9, 8])
    expect(chart.title).toBe('total por mes')
  })

  it('fechas completas, años en texto y meses numéricos (EXTRACT) también son líneas', () => {
    expect(detectChartType([{ d: '2025-01-05', v: 1 }, { d: '2025-01-06', v: 2 }], ['d', 'v']).type).toBe('line')
    expect(detectChartType([{ año: '2023', v: 1 }, { año: '2024', v: 2 }], ['año', 'v']).type).toBe('line')
    const numericMonths = [{ mes: 2, total: 9 }, { mes: 1, total: 3 }]
    const chart = detectChartType(numericMonths, ['mes', 'total'])
    expect(chart.type).toBe('line')
    expect(chart.data.map((p) => p.name)).toEqual(['1', '2'])
  })

  it('una sola fila no es una serie: no se grafica', () => {
    expect(detectChartType([{ mes: '2025-01', total: 3 }], ['mes', 'total']).type).toBe('text')
  })

  it('una columna numérica llamada "mes" sin otra métrica NO se toma como tiempo', () => {
    expect(detectChartType([{ mes: 1 }, { mes: 2 }, { mes: 3 }], ['mes']).type).toBe('histogram')
  })
})

describe('detectChartType: tipo pedido por el usuario', () => {
  const planets = [
    { planeta: 'Mercurio', lunas: 0 }, { planeta: 'Tierra', lunas: 1 }, { planeta: 'Júpiter', lunas: 95 },
  ]
  const months = [{ mes: '2025-02', total: 9 }, { mes: '2025-01', total: 3 }]

  it('"en barras" sobre pocas categorías da barras (no la dona automática)', () => {
    expect(detectChartType(planets, ['planeta', 'lunas'], { preferred: 'bar' }).type).toBe('bar')
  })

  it('"en torta" sobre una suma da dona', () => {
    expect(detectChartType(planets, ['planeta', 'lunas'], { preferred: 'pie' }).type).toBe('pie')
  })

  it('"en líneas" sobre categorías respeta el orden de los datos', () => {
    const chart = detectChartType(planets, ['planeta', 'lunas'], { preferred: 'line' })
    expect(chart.type).toBe('line')
    expect(chart.data.map((p) => p.name)).toEqual(['Mercurio', 'Tierra', 'Júpiter'])
  })

  it('"en barras" sobre fechas ordena cronológicamente; "en torta" también se puede', () => {
    const bars = detectChartType(months, ['mes', 'total'], { preferred: 'bar' })
    expect(bars.type).toBe('bar')
    expect(bars.data.map((b) => b.name)).toEqual(['2025-01', '2025-02'])
    expect(detectChartType(months, ['mes', 'total'], { preferred: 'pie' }).type).toBe('pie')
  })

  it('un tipo imposible con estos datos cae al gráfico automático', () => {
    // dispersión necesita dos columnas numéricas; aquí hay una categoría y un número
    expect(detectChartType(planets, ['planeta', 'lunas'], { preferred: 'scatter' }).type).toBe('bar')
    // línea con una sola fila
    expect(detectChartType([{ planeta: 'Tierra', lunas: 1 }], ['planeta', 'lunas'], { preferred: 'line' }).type).toBe('text')
  })

  it('un sector de la dona nunca es negativo', () => {
    const rows = [{ c: 'a', n: -5 }, { c: 'b', n: 10 }]
    expect(detectChartType(rows, ['c', 'n'], { preferred: 'pie' }).data.map((d) => d.value)).toEqual([0, 10])
  })
})

describe('motor de reglas: pedidos de gráficos', () => {
  const planetColumns = ['planeta', 'tipo', 'diametro_km', 'distancia_al_sol_millones_km', 'periodo_orbital_dias', 'lunas_conocidas']
  const planetTypes = { planeta: 'string', tipo: 'string', diametro_km: 'integer', distancia_al_sol_millones_km: 'float', periodo_orbital_dias: 'integer', lunas_conocidas: 'integer' }
  const salesColumns = ['fecha', 'ciudad', 'cantidad']
  const salesTypes = { fecha: 'datetime', ciudad: 'string', cantidad: 'integer' }

  it('"haz un gráfico de la cantidad de lunas en los planetas" (el caso del bug) devuelve los datos a graficar', () => {
    const sql = generateFallbackSql('haz un gráfico de la cantidad de lunas en los planetas', planetColumns, planetTypes)
    expect(sql).toContain('"planeta"')
    expect(sql).toContain('SUM("lunas_conocidas")')
    expect(sql).toContain('GROUP BY "planeta"')
  })

  it('sin "cantidad/total" promedia; solo una categoría cuenta; solo un número hace histograma', () => {
    expect(generateFallbackSql('grafica el diametro por planeta', planetColumns, planetTypes)).toContain('AVG("diametro_km")')
    expect(generateFallbackSql('gráfico del tipo', planetColumns, planetTypes)).toContain('COUNT(*) AS "conteo"')
    expect(generateFallbackSql('gráfico del diametro', planetColumns, planetTypes)).toBe('SELECT "diametro_km" FROM data WHERE "diametro_km" IS NOT NULL')
  })

  it('"evolución por mes" agrupa la fecha por mes; "por año" por año', () => {
    const monthly = generateFallbackSql('evolución de la cantidad por mes', salesColumns, salesTypes)
    expect(monthly).toContain("strftime(date_trunc('month', \"fecha\"), '%Y-%m')")
    expect(monthly).toContain('SUM("cantidad")')
    expect(generateFallbackSql('cantidad por año', salesColumns, salesTypes)).toContain("date_trunc('year'")
    expect(generateFallbackSql('promedio de cantidad por mes', salesColumns, salesTypes)).toContain('AVG("cantidad")')
    expect(generateFallbackSql('cuántos registros por mes', salesColumns, salesTypes)).toContain('COUNT(*)')
  })

  it('sin columna de fecha, "por mes" no inventa una serie de tiempo', () => {
    expect(generateFallbackSql('cantidad de lunas por mes', planetColumns, planetTypes)).not.toContain('date_trunc')
  })

  it('una charla que menciona "gráfico" pero no los datos sigue sin generar consulta', () => {
    expect(generateFallbackSql('como hago un gráfico en excel', planetColumns, planetTypes)).toBeNull()
  })
})

describe('chat de punta a punta (sin IA)', () => {
  it('el pedido de las lunas devuelve un gráfico de barras con los 5 planetas (antes: código de matplotlib)', async () => {
    const ds = await uploadDataset(csvFile('planetas.csv', PLANETAS))
    const reply = await sendMessage(ds.id, 'haz un grafico de la cantidad de lunas en los planetas', { llm: NO_LLM })
    expect(reply.sql_generated).toBeTruthy()
    expect(reply.content).not.toMatch(/matplotlib|import pandas/)
    expect(reply.query_result.chart.type).toBe('bar')
    const byName = Object.fromEntries(reply.query_result.chart.data.map((p) => [p.name, p.value]))
    expect(byName).toEqual({ Júpiter: 95, Marte: 2, Tierra: 1, Mercurio: 0, Venus: 0 })
  })

  it('la misma pregunta "en torta" cambia el tipo, con los mismos datos', async () => {
    const ds = await uploadDataset(csvFile('planetas2.csv', PLANETAS))
    const reply = await sendMessage(ds.id, 'haz un grafico de la cantidad de lunas por planeta en torta', { llm: NO_LLM })
    expect(reply.query_result.chart.type).toBe('pie')
  })

  it('"evolución de la cantidad por mes" da una línea ordenada por mes', async () => {
    const ds = await uploadDataset(csvFile('ventas-linea.csv', VENTAS))
    const reply = await sendMessage(ds.id, 'evolución de la cantidad por mes', { llm: NO_LLM })
    const { chart } = reply.query_result
    expect(chart.type).toBe('line')
    expect(chart.data).toEqual([
      { name: '2025-01', value: 8 },
      { name: '2025-02', value: 10 },
      { name: '2025-03', value: 12 },
    ])
  })

  it('"cantidad por mes en barras" respeta el tipo pedido', async () => {
    const ds = await uploadDataset(csvFile('ventas-barras.csv', VENTAS))
    const reply = await sendMessage(ds.id, 'cantidad por mes en barras', { llm: NO_LLM })
    expect(reply.query_result.chart.type).toBe('bar')
    expect(reply.query_result.chart.data.map((b) => b.name)).toEqual(['2025-01', '2025-02', '2025-03'])
  })

  it('el SQL de la IA con strftime también termina en una línea', async () => {
    const ds = await uploadDataset(csvFile('ventas-ia.csv', VENTAS))
    const llm = {
      enabled: true,
      ask: async () => ({ sql: "SELECT strftime(date_trunc('month', \"fecha\"), '%Y-%m') AS mes, SUM(\"cantidad\") AS total FROM data GROUP BY 1 ORDER BY 1" }),
      answer: async () => 'Las ventas crecen cada mes.',
    }
    const reply = await sendMessage(ds.id, 'cómo van las ventas en el tiempo', { llm })
    expect(reply.query_result.chart.type).toBe('line')
    expect(reply.content).toBe('Las ventas crecen cada mes.')
  })
})

describe('sugerencias del chat con gráficos', () => {
  const dataset = {
    columns: ['fecha', 'ciudad', 'cantidad'],
    dtypes: { fecha: 'datetime', ciudad: 'string', cantidad: 'integer' },
  }
  const analysis = { data_quality: { ciudad: { unique_count: 3 } } }

  it('si hay fechas sugiere la evolución por mes, y todas se resuelven sin IA', async () => {
    const suggestions = buildSuggestions(dataset, analysis)
    expect(suggestions).toContain('Evolución de cantidad por mes')

    const ds = await uploadDataset(csvFile('ventas-sug.csv', VENTAS))
    for (const question of suggestions) {
      const reply = await sendMessage(ds.id, question, { llm: NO_LLM })
      expect(reply.sql_generated, question).toBeTruthy()
      expect(reply.query_result.data.length, question).toBeGreaterThan(0)
    }
  })

  it('sin fechas no ofrece series de tiempo', () => {
    const noDates = { columns: ['ciudad', 'cantidad'], dtypes: { ciudad: 'string', cantidad: 'integer' } }
    expect(buildSuggestions(noDates, analysis).join(' ')).not.toMatch(/por mes/)
  })
})
