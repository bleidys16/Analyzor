import { describe, expect, it } from 'vitest'
import { clipboardToCsv, inspectCsvSnippet } from '../clipboard'

describe('clipboardToCsv', () => {
  it('convierte datos tabulados de Excel/Sheets a CSV estándar', () => {
    const tsv = 'Producto\tPrecio\tCantidad\nLaptop\t1200\t5\nMouse\t25\t10'
    const csv = clipboardToCsv(tsv)
    expect(csv).toBe('Producto,Precio,Cantidad\nLaptop,1200,5\nMouse,25,10')
  })

  it('escapa celdas que contienen comas o comillas', () => {
    const tsv = 'Cliente\tDirección\tTotal\n"Tech Corp"\tCalle 1, #2\t500'
    const csv = clipboardToCsv(tsv)
    expect(csv).toBe('Cliente,Dirección,Total\n"""Tech Corp""","Calle 1, #2",500')
  })

  it('respeta texto que ya viene separado por comas', () => {
    const rawCsv = 'a,b,c\n1,2,3'
    expect(clipboardToCsv(rawCsv)).toBe(rawCsv)
  })

  it('devuelve cadena vacía si no hay contenido válido', () => {
    expect(clipboardToCsv('')).toBe('')
    expect(clipboardToCsv('   \n  \n  ')).toBe('')
    expect(clipboardToCsv(null)).toBe('')
  })
})

describe('inspectCsvSnippet', () => {
  it('calcula filas de datos y cantidad de columnas al instante', () => {
    const text = 'col1,col2,col3,col4\n1,2,3,4\n5,6,7,8\n9,10,11,12'
    const { rowsCount, colsCount } = inspectCsvSnippet(text)
    expect(rowsCount).toBe(3)
    expect(colsCount).toBe(4)
  })

  it('detecta delimitadores por tabulación', () => {
    const text = 'Nombre\tEdad\tCiudad\nAna\t28\tBogotá\nCarlos\t34\tMedellín'
    const { rowsCount, colsCount } = inspectCsvSnippet(text)
    expect(rowsCount).toBe(2)
    expect(colsCount).toBe(3)
  })

  it('maneja archivo vacío o de una sola cabecera sin filas', () => {
    expect(inspectCsvSnippet('id,nombre')).toEqual({ rowsCount: 0, colsCount: 2 })
    expect(inspectCsvSnippet('')).toEqual({ rowsCount: 0, colsCount: 0 })
  })
})
