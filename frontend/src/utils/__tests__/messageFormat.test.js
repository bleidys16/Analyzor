import { describe, expect, it } from 'vitest'
import { parseInline, parseMessage } from '../messageFormat'

const F = '`'.repeat(3)

describe('parseMessage', () => {
  it('un texto sin código es un solo segmento', () => {
    expect(parseMessage('Hola, ¿cómo estás?')).toEqual([{ type: 'text', text: 'Hola, ¿cómo estás?' }])
  })

  it('separa el texto y el bloque de código, con su lenguaje', () => {
    const msg = `Así se hace en Java:\n${F}java\npublic class Main {\n  void f() {}\n}\n${F}\nY listo.`
    expect(parseMessage(msg)).toEqual([
      { type: 'text', text: 'Así se hace en Java:' },
      { type: 'code', lang: 'java', code: 'public class Main {\n  void f() {}\n}' },
      { type: 'text', text: 'Y listo.' },
    ])
  })

  it('varios bloques, con y sin lenguaje', () => {
    const msg = `${F}sql\nSELECT 1\n${F}\ny\n${F}\nplano\n${F}`
    expect(parseMessage(msg).map((s) => [s.type, s.lang ?? null])).toEqual([
      ['code', 'sql'], ['text', null], ['code', ''],
    ])
  })

  it('un bloque sin cerrar (respuesta cortada) se muestra como código, sin perder texto', () => {
    const segments = parseMessage(`Mira:\n${F}python\nprint("hola")`)
    expect(segments).toEqual([
      { type: 'text', text: 'Mira:' },
      { type: 'code', lang: 'python', code: 'print("hola")' },
    ])
  })

  it('conserva la indentación y las líneas en blanco dentro del código', () => {
    const [block] = parseMessage(`${F}\na\n\n    b\n${F}`)
    expect(block.code).toBe('a\n\n    b')
  })

  it('vacío o nulo no rompe', () => {
    expect(parseMessage('')).toEqual([])
    expect(parseMessage(null)).toEqual([])
  })
})

describe('parseInline', () => {
  it('reconoce **negritas** y `código en línea`', () => {
    expect(parseInline('La ciudad **Cali** usa `SUM(x)`.')).toEqual([
      { type: 'text', text: 'La ciudad ' },
      { type: 'bold', text: 'Cali' },
      { type: 'text', text: ' usa ' },
      { type: 'code', text: 'SUM(x)' },
      { type: 'text', text: '.' },
    ])
  })

  it('los asteriscos sueltos y el HTML se dejan como texto plano', () => {
    expect(parseInline('2 * 3 ** <b>x</b>')).toEqual([{ type: 'text', text: '2 * 3 ** <b>x</b>' }])
  })
})
