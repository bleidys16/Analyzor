// Exporta un gráfico de Recharts (SVG en pantalla) como imagen PNG.
//
// El SVG de la página depende de variables CSS (var(--card-border)...) y de hojas de estilo que no viajan
// con él al serializarlo, así que antes de dibujarlo se copian a cada elemento los estilos ya resueltos.

const STYLE_PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap',
  'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline',
]
const SCALE = 2
const PADDING = 16
const TITLE_HEIGHT = 34
const LEGEND_ROW_HEIGHT = 22
const FONT = 'Geist, system-ui, sans-serif'

export const slugify = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'grafico'

// Reparte los elementos de la leyenda en filas que quepan en `width`. `measure(text)` devuelve el ancho en px.
export function layoutLegend(items, width, measure) {
  const rows = [[]]
  let used = 0
  for (const item of items) {
    const itemWidth = 14 + measure(item.name) + 14 // cuadro de color + texto + separación
    if (used > 0 && used + itemWidth > width) {
      rows.push([])
      used = 0
    }
    rows.at(-1).push({ ...item, x: used, width: itemWidth })
    used += itemWidth
  }
  return rows.filter((row) => row.length > 0)
}

function inlineComputedStyles(source, clone) {
  const sources = [source, ...source.querySelectorAll('*')]
  const clones = [clone, ...clone.querySelectorAll('*')]
  sources.forEach((el, i) => {
    const computed = getComputedStyle(el)
    for (const prop of STYLE_PROPS) clones[i].style.setProperty(prop, computed.getPropertyValue(prop))
  })
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo generar la imagen del gráfico'))
    image.src = url
  })
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo generar la imagen del gráfico'))), 'image/png')
  )
}

// container: elemento que contiene el <svg> de Recharts. Devuelve un Blob PNG con fondo, título y leyenda.
export async function chartToPng(container, { title = '', legend = [] } = {}) {
  const svg = container.querySelector('svg.recharts-surface')
  if (!svg) throw new Error('El gráfico todavía no está listo')

  const { width, height } = svg.getBoundingClientRect()
  const clone = svg.cloneNode(true)
  inlineComputedStyles(svg, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
  const svgText = new XMLSerializer().serializeToString(clone)
  const image = await loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`)

  const page = getComputedStyle(container)
  const background = page.getPropertyValue('--card-bg').trim() || '#ffffff'
  const textColor = page.getPropertyValue('--text-main').trim() || '#111827'
  const mutedColor = page.getPropertyValue('--text-muted').trim() || '#6b7280'

  const measureCanvas = document.createElement('canvas').getContext('2d')
  measureCanvas.font = `12px ${FONT}`
  const innerWidth = Math.max(width, 280)
  const rows = layoutLegend(legend, innerWidth, (text) => measureCanvas.measureText(text).width)

  const totalWidth = innerWidth + PADDING * 2
  const titleHeight = title ? TITLE_HEIGHT : 0
  const legendHeight = rows.length * LEGEND_ROW_HEIGHT
  const totalHeight = PADDING * 2 + titleHeight + height + legendHeight

  const canvas = document.createElement('canvas')
  canvas.width = totalWidth * SCALE
  canvas.height = totalHeight * SCALE
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = background
  ctx.fillRect(0, 0, totalWidth, totalHeight)

  if (title) {
    ctx.fillStyle = textColor
    ctx.font = `600 15px ${FONT}`
    ctx.textBaseline = 'middle'
    ctx.fillText(title, PADDING, PADDING + TITLE_HEIGHT / 2)
  }

  ctx.drawImage(image, PADDING + (innerWidth - width) / 2, PADDING + titleHeight, width, height)

  ctx.font = `12px ${FONT}`
  ctx.textBaseline = 'middle'
  rows.forEach((row, r) => {
    const y = PADDING + titleHeight + height + r * LEGEND_ROW_HEIGHT + LEGEND_ROW_HEIGHT / 2
    for (const item of row) {
      ctx.fillStyle = item.color
      ctx.fillRect(PADDING + item.x, y - 5, 10, 10)
      ctx.fillStyle = mutedColor
      ctx.fillText(item.name, PADDING + item.x + 14, y)
    }
  })

  return canvasToBlob(canvas)
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
