import { describe, expect, it } from 'vitest'
import { layoutLegend, slugify } from '../chartImage'

describe('slugify', () => {
  it('convierte el título del gráfico en un nombre de archivo seguro', () => {
    expect(slugify('total_lunas_conocidas por planeta')).toBe('total-lunas-conocidas-por-planeta')
    expect(slugify('Distribución de ñandú / año 2025')).toBe('distribucion-de-nandu-ano-2025')
  })

  it('un título vacío o sin letras usa un nombre por defecto', () => {
    expect(slugify('')).toBe('grafico')
    expect(slugify('???')).toBe('grafico')
    expect(slugify(undefined)).toBe('grafico')
  })

  it('recorta títulos larguísimos', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(60)
  })
})

describe('layoutLegend', () => {
  // cada letra mide 6 px; cada elemento ocupa 14 + texto + 14
  const measure = (text) => text.length * 6
  const items = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla'].map((name, i) => ({ name, color: `c${i}` }))

  it('si todo cabe, una sola fila con posiciones acumuladas', () => {
    const rows = layoutLegend(items, 1000, measure)
    expect(rows).toHaveLength(1)
    expect(rows[0].map((i) => i.x)).toEqual([0, 64, 140, 192])
  })

  it('reparte en varias filas cuando no cabe y reinicia la posición', () => {
    const rows = layoutLegend(items, 160, measure)
    expect(rows.map((row) => row.map((i) => i.name))).toEqual([['Bogotá', 'Medellín'], ['Cali', 'Barranquilla']])
    expect(rows[1][0].x).toBe(0)
  })

  it('un elemento más ancho que la fila va solo y no se pierde', () => {
    const rows = layoutLegend([{ name: 'x'.repeat(100), color: 'c' }, { name: 'b', color: 'c' }], 50, measure)
    expect(rows.flat()).toHaveLength(2)
    expect(rows[0]).toHaveLength(1)
  })

  it('sin elementos no hay filas', () => {
    expect(layoutLegend([], 100, measure)).toEqual([])
  })
})
