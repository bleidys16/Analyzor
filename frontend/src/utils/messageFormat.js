// Formato ligero de los mensajes del chat: bloques de código (```lang), **negritas** y `código en línea`.
// Devuelve estructuras de datos (no HTML): el componente decide cómo pintarlas, así no hay riesgo de inyección.

const FENCE = '```'

// Divide un mensaje en segmentos { type: 'text', text } y { type: 'code', lang, code }
export function parseMessage(source) {
  const text = String(source ?? '')
  const segments = []
  const trimBreaks = (s) => s.replace(/^\n+|\n+$/g, '')
  const pushText = (s) => {
    const t = trimBreaks(s)
    if (t) segments.push({ type: 'text', text: t })
  }

  let position = 0
  for (;;) {
    const open = text.indexOf(FENCE, position)
    if (open === -1) break
    pushText(text.slice(position, open))

    const header = text.slice(open + FENCE.length).match(/^([\w+#.-]*)[ \t]*\n?/)
    const bodyStart = open + FENCE.length + header[0].length
    const close = text.indexOf(FENCE, bodyStart)
    const end = close === -1 ? text.length : close // bloque sin cerrar (respuesta cortada): el resto es código
    segments.push({ type: 'code', lang: header[1], code: text.slice(bodyStart, end).replace(/\n$/, '') })
    position = close === -1 ? text.length : close + FENCE.length
  }
  pushText(text.slice(position))
  return segments
}

// Divide un texto en trozos { type: 'text' | 'bold' | 'code', text }
export function parseInline(source) {
  return String(source ?? '')
    .split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return { type: 'bold', text: part.slice(2, -2) }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) return { type: 'code', text: part.slice(1, -1) }
      return { type: 'text', text: part }
    })
}
