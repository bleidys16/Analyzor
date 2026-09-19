import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CsvError, loadCsv } from '../csv'
import { profileTable, previewRows } from '../profile'
import { runSelect } from '../select'
import { cleanLlmSql, validateSelect } from '../sqlGuard'
import { isIdColumn, jsonSafe } from '../values'
import { detectChartType } from '../chartGenerator'
import { generateFallbackAnswer, generateFallbackSql, matchColumns } from '../fallbackSql'
import { createNodeRunner, csvBytes } from './nodeRunner'

let runner
beforeAll(async () => { runner = await createNodeRunner() })
afterAll(async () => { await runner.close() })

const hasNaN = (value) => {
  if (typeof value === 'number') return !Number.isFinite(value)
  if (value && typeof value === 'object') return Object.values(value).some(hasNaN)
  return false
}

describe('loadCsv', () => {
  it('detecta tipos, fechas incluidas', async () => {
    const { schema, rowsCount } = await loadCsv(runner, csvBytes('name,joined,amount\nAna,2024-01-05,10.5\nLuis,2024-02-10,20\n'))
    expect(rowsCount).toBe(2)
    expect(schema.map((c) => c.dtype)).toEqual(['string', 'datetime', 'float'])
  })

  it('cuenta las filas exactas en archivos grandes (antes daba 1999)', async () => {
    const body = 'id,name,val\n' + Array.from({ length: 6000 }, (_, i) => `${i},n${i},${i * 1.5}`).join('\n')
    expect((await loadCsv(runner, csvBytes(body))).rowsCount).toBe(6000)
  })

  it('lee CSV de Excel en español: Latin-1, separador ; y coma decimal', async () => {
    const { schema, rowsCount } = await loadCsv(runner, csvBytes('nombre;edad;precio\nJosé;30;10,5\nMaría;25;20,25\n', 'latin1'))
    expect(rowsCount).toBe(2)
    expect(schema.map((c) => c.name)).toEqual(['nombre', 'edad', 'precio'])
    expect(schema.find((c) => c.name === 'precio').numeric).toBe(true)
    const { data } = await runSelect(runner, 'SELECT nombre FROM data ORDER BY nombre')
    expect(data.map((r) => r.nombre)).toEqual(['José', 'María'])
  })

  it('acepta un CSV con solo el encabezado (0 filas)', async () => {
    expect((await loadCsv(runner, csvBytes('a,b,c\n'))).rowsCount).toBe(0)
  })

  it('rechaza un archivo vacío con mensaje claro', async () => {
    await expect(loadCsv(runner, csvBytes(''))).rejects.toBeInstanceOf(CsvError)
  })
})

describe('profileTable', () => {
  it('una columna constante NO produce NaN (rompía el análisis en Postgres)', async () => {
    const { schema } = await loadCsv(runner, csvBytes('a,b,c\n1,5,1\n2,5,2\n3,5,3\n4,5,5\n'))
    const p = await profileTable(runner, schema)
    expect(hasNaN(p)).toBe(false)
    expect(p.correlations.b.a).toBeNull()
    expect(p.correlations.b.b).toBeNull()
    expect(p.correlations.a.c).toBeGreaterThan(0.9)
    expect(p.correlations.a.c).toBe(p.correlations.c.a)
    expect(p.correlations.a.a).toBe(1)
    expect(() => JSON.stringify(p)).not.toThrow()
  })

  it('calcula estadísticas y calidad', async () => {
    const { schema } = await loadCsv(runner, csvBytes('edad,ciudad\n10,Bogota\n20,Bogota\n30,Cali\n,Cali\n'))
    const p = await profileTable(runner, schema)
    expect(p.statistics.edad).toMatchObject({ mean: 20, median: 20, min: 10, max: 30, null_count: 1, null_pct: 25 })
    expect(p.statistics.ciudad).toMatchObject({ unique: 2 })
    expect(p.data_quality.edad).toMatchObject({ dtype: 'integer', unique_count: 3, null_count: 1 })
    expect(p.data_quality.ciudad.dtype).toBe('string')
  })

  it('una sola fila: la desviación es null (no rompe el PDF)', async () => {
    const { schema } = await loadCsv(runner, csvBytes('Sales & Marketing,valor\nx,5\n'))
    const p = await profileTable(runner, schema)
    expect(p.statistics.valor.mean).toBe(5)
    expect(p.statistics.valor.std).toBeNull()
  })

  it('detecta columnas casi vacías', async () => {
    const { schema } = await loadCsv(runner, csvBytes('a,b\n1,\n2,\n3,\n4,x\n'))
    const p = await profileTable(runner, schema)
    expect(p.anomalies.some((a) => a.type === 'high_missing' && a.column === 'b')).toBe(true)
  })

  it('la vista previa trae fechas como texto', async () => {
    await loadCsv(runner, csvBytes('d,x\n2024-01-05,1\n'))
    expect(await previewRows(runner)).toEqual([{ d: '2024-01-05', x: 1 }])
  })
})

describe('runSelect', () => {
  it('serializa fechas a texto (antes: 500 al guardar en JSON)', async () => {
    await loadCsv(runner, csvBytes('name,joined\nAna,2024-01-05\n'))
    const res = await runSelect(runner, 'SELECT * FROM data')
    expect(res.error).toBeNull()
    expect(res.data[0].joined).toBe('2024-01-05')
    expect(() => JSON.stringify(res.data)).not.toThrow()
  })

  it('EXTRACT(... FROM columna) funciona (antes se reescribía mal)', async () => {
    await loadCsv(runner, csvBytes('joined\n2024-01-05\n2024-02-10\n2023-03-01\n'))
    const res = await runSelect(runner, 'SELECT EXTRACT(year FROM joined) AS y, COUNT(*) AS c FROM data GROUP BY y ORDER BY y')
    expect(res.data).toEqual([{ y: 2023, c: 1 }, { y: 2024, c: 2 }])
  })

  it('limita las filas devueltas', async () => {
    await loadCsv(runner, csvBytes('n\n' + Array.from({ length: 50 }, (_, i) => i).join('\n')))
    const res = await runSelect(runner, 'SELECT * FROM data', { limit: 10 })
    expect(res.row_count).toBe(10)
    expect(res.truncated).toBe(true)
  })

  it('acepta WITH, punto y coma final y comentarios', async () => {
    await loadCsv(runner, csvBytes('n\n1\n2\n'))
    expect((await runSelect(runner, 'WITH t AS (SELECT * FROM data) SELECT sum(n) AS s FROM t;')).data[0].s).toBe(3)
    expect((await runSelect(runner, 'SELECT count(*) AS c FROM data -- total')).data[0].c).toBe(2)
  })

  it.each([
    ['varias sentencias', 'SELECT 1; DROP TABLE data'],
    ['DROP', 'DROP TABLE data'],
    ['COPY', "COPY (SELECT 1) TO 'x.csv'"],
    ['leer archivos', "SELECT * FROM read_text('/etc/passwd')"],
    ['leer csv remoto', "SELECT * FROM read_csv('http://x/y.csv')"],
    ['SET', 'SET threads=1'],
    ['dollar quoting', "SELECT $$;DROP TABLE data;--$$"],
  ])('rechaza %s', async (_name, sql) => {
    await loadCsv(runner, csvBytes('n\n1\n'))
    const res = await runSelect(runner, sql)
    expect(res.error).toBeTruthy()
    expect((await runSelect(runner, 'SELECT count(*) AS c FROM data')).data[0].c).toBe(1)
  })

  it('un ; dentro de un texto no cuenta como segunda consulta', () => {
    expect(validateSelect("SELECT ';' AS semi").ok).toBe(true)
  })
})

describe('cleanLlmSql', () => {
  it('extrae el SQL de bloques markdown y de texto alrededor', () => {
    expect(cleanLlmSql('```sql\nSELECT 1 FROM data\n```')).toBe('SELECT 1 FROM data')
    expect(cleanLlmSql('Aquí tienes: SELECT AVG(x) FROM data')).toBe('SELECT AVG(x) FROM data')
    expect(cleanLlmSql('Error: cannot generate SQL')).toBeNull()
    expect(cleanLlmSql(null)).toBeNull()
  })
})

describe('isIdColumn', () => {
  it.each([
    ['customer_id', true], ['CustomerId', true], ['Customer Id', true], ['SKU', true], ['codigo_postal', true],
    ['Cantidad', false], ['Unidades', false], ['Calidad', false], ['Velocidad', false], ['valid', false], ['width', false],
  ])('%s -> %s', (name, expected) => expect(isIdColumn(name)).toBe(expected))
})

describe('fallback de reglas', () => {
  const dtypes = { Descripcion: 'string', Precio: 'float', Ciudad: 'string', Ventas: 'integer', customer_id: 'integer', Edad: 'integer' }
  const columns = ['customer_id', 'Descripcion', 'Precio', 'Ciudad', 'Ventas', 'Edad']

  it('no confunde palabras de relleno con columnas', () => {
    expect(matchColumns('promedio de precio', columns)).toEqual(['Precio'])
    expect(matchColumns('¿Cuál es el promedio de edad?', columns)).toEqual(['Edad'])
  })

  it('promedio de una columna, con o sin agrupación', () => {
    expect(generateFallbackSql('promedio de precio', columns, dtypes)).toBe('SELECT AVG("Precio") AS "promedio_Precio" FROM data')
    expect(generateFallbackSql('promedio de ventas por ciudad', columns, dtypes))
      .toContain('GROUP BY "Ciudad"')
  })

  it('promedio de "todo" no incluye columnas ID ni de texto', () => {
    const sql = generateFallbackSql('cuál es el promedio', columns, dtypes)
    expect(sql).not.toContain('customer_id')
    expect(sql).not.toContain('Descripcion')
    expect(sql).toContain('"Precio"')
  })

  it('las palabras clave se buscan completas ("conversión" no dispara "ver")', () => {
    expect(generateFallbackSql('mi conversión general', columns, dtypes)).toBeNull()
    expect(generateFallbackSql('ver datos', columns, dtypes)).toBe('SELECT * FROM data LIMIT 50')
  })

  it('el SQL generado se ejecuta y la respuesta no revienta con nulos', async () => {
    await loadCsv(runner, csvBytes('Precio,Ciudad\n10,Bogota\n20,Bogota\n30,Cali\n'))
    const sql = generateFallbackSql('promedio de precio por ciudad', ['Precio', 'Ciudad'], { Precio: 'integer', Ciudad: 'string' })
    const res = await runSelect(runner, sql)
    expect(res.error).toBeNull()
    expect(generateFallbackAnswer('promedio de precio por ciudad', res, sql)).toContain('Bogota')
    const nullRes = { data: [{ promedio_x: null }], columns: ['promedio_x'], row_count: 1 }
    expect(generateFallbackAnswer('promedio de x', nullRes, 'SELECT AVG(x) FROM data')).toContain('No hay valores')
  })
})

describe('detectChartType', () => {
  it('agrupado con pocas categorías -> pie; muchas -> bar', () => {
    const few = Array.from({ length: 3 }, (_, i) => ({ c: `c${i}`, n: i + 1 }))
    const many = Array.from({ length: 12 }, (_, i) => ({ c: `c${i}`, n: i + 1 }))
    expect(detectChartType(few, ['c', 'n']).type).toBe('pie')
    expect(detectChartType(many, ['c', 'n']).type).toBe('bar')
  })

  it('varios promedios en una fila -> barras por métrica (no un scatter de un punto)', () => {
    expect(detectChartType([{ a: 1, b: 2 }], ['a', 'b'])).toMatchObject({ type: 'bar', title: 'Métricas' })
  })

  it('un listado de registros no se grafica', () => {
    const rows = [{ a: 'x', b: 1, c: 2, d: 3 }, { a: 'y', b: 2, c: 3, d: 4 }]
    expect(detectChartType(rows, ['a', 'b', 'c', 'd']).type).toBe('text')
  })

  it('una columna numérica -> histograma con todos los datos contados', () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ v: i }))
    const chart = detectChartType(rows, ['v'])
    expect(chart.type).toBe('histogram')
    expect(chart.data.reduce((s, b) => s + b.count, 0)).toBe(30)
  })
})

describe('jsonSafe', () => {
  it('normaliza bigint, NaN y fechas', () => {
    expect(jsonSafe(10n)).toBe(10)
    expect(jsonSafe(NaN)).toBeNull()
    expect(jsonSafe(new Date('2024-01-05T00:00:00Z'))).toBe('2024-01-05T00:00:00.000Z')
  })
})
