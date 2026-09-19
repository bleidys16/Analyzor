// Reporte PDF generado en el navegador (jsPDF). Se importa de forma perezosa desde exportService.
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLORS = {
  primary: [17, 24, 39],
  accent: [239, 68, 68],
  muted: [107, 114, 128],
  header: [30, 41, 59],
  rowAlt: [249, 250, 251],
}
const MARGIN = 20
const PAGE_BOTTOM = 270
const PREVIEW_ROWS = 10
const PREVIEW_COLUMNS = 8

const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })
const num = (v) => (typeof v === 'number' ? numberFormat.format(v) : '-')

// Las fuentes estándar de PDF solo cubren Latin-1: cualquier otro carácter se reemplaza
const text = (value) =>
  String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E¡-ÿ]/g, '?')

const isNumericStat = (s) => s && s.mean !== undefined

export function buildReport(dataset, analysis) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const rows = dataset.rows_count || 0
  const columns = Array.isArray(dataset.columns) ? dataset.columns : []
  const quality = analysis?.data_quality || {}
  const statistics = analysis?.statistics || {}
  const numericCount = columns.filter((c) => ['integer', 'float'].includes(dataset.dtypes?.[c])).length
  let y = 40

  const tableStyle = {
    theme: 'striped',
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 2, textColor: COLORS.primary },
    headStyles: { fillColor: COLORS.header, textColor: 255 },
    alternateRowStyles: { fillColor: COLORS.rowAlt },
  }
  const table = (options) => {
    autoTable(doc, { ...tableStyle, startY: y, ...options })
    y = doc.lastAutoTable.finalY + 10
  }
  const section = (title) => {
    if (y > PAGE_BOTTOM - 30) {
      doc.addPage()
      y = 25
    }
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...COLORS.accent)
    doc.text(title, MARGIN, y)
    y += 4
  }

  // Portada
  doc.setDrawColor(...COLORS.accent).setLineWidth(1)
  doc.line(width / 2 - 30, y, width / 2 + 30, y)
  y += 10
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...COLORS.muted)
  doc.text('REPORTE DE DATOS', width / 2, y, { align: 'center' })
  y += 12
  doc.setFontSize(24).setTextColor(...COLORS.primary)
  doc.text(doc.splitTextToSize(text(dataset.name), width - 2 * MARGIN), width / 2, y, { align: 'center' })
  y += 12
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...COLORS.muted)
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(text(`Generado el ${today}`), width / 2, y, { align: 'center' })
  y += 12

  table({
    head: [['Filas', 'Columnas', 'Numéricas', 'Categóricas', 'Tamaño']].map((r) => r.map(text)),
    body: [[
      numberFormat.format(rows),
      columns.length,
      numericCount,
      columns.length - numericCount,
      `${((dataset.file_size || 0) / 1024).toFixed(1)} KB`,
    ]],
    styles: { ...tableStyle.styles, fontSize: 11, halign: 'center' },
  })

  // Calidad de datos
  section('Calidad de datos')
  const qualityRows = Object.entries(quality)
  if (qualityRows.length) {
    table({
      head: [['Columna', 'Tipo', 'No nulos', '% Nulos', 'Únicos']].map((r) => r.map(text)),
      body: qualityRows.map(([col, q]) => [
        text(col),
        text(q.dtype),
        numberFormat.format(Math.max(rows - (q.null_count || 0), 0)),
        `${num(q.null_pct)}%`,
        numberFormat.format(q.unique_count || 0),
      ]),
    })
  } else {
    y += 6
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...COLORS.primary)
    doc.text('Sin datos de calidad disponibles.', MARGIN, y)
    y += 10
  }

  // Anomalías
  if (analysis?.anomalies?.length) {
    section('Anomalías detectadas')
    table({ body: analysis.anomalies.map((a) => [text(a.message)]) })
  }

  // Estadísticas descriptivas
  section('Estadísticas descriptivas')
  const numericStats = Object.entries(statistics).filter(([, s]) => isNumericStat(s))
  if (numericStats.length) {
    table({
      head: [['Columna', 'Media', 'Mediana', 'Desv.', 'Mín', 'Máx', 'Q25', 'Q75']].map((r) => r.map(text)),
      body: numericStats.map(([col, s]) => [text(col), num(s.mean), num(s.median), num(s.std), num(s.min), num(s.max), num(s.q25), num(s.q75)]),
    })
  } else {
    y += 6
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...COLORS.primary)
    doc.text('No hay columnas numéricas con estadísticas.', MARGIN, y)
    y += 10
  }

  // Categóricas
  const categorical = Object.entries(statistics).filter(([, s]) => s && !isNumericStat(s))
  if (categorical.length) {
    section('Distribución de categóricas')
    table({
      head: [['Columna', 'Valores únicos', 'Más común']].map((r) => r.map(text)),
      body: categorical.map(([col, s]) => [text(col), numberFormat.format(s.unique || 0), text(s.most_common ?? '-')]),
    })
  }

  // Vista previa
  const preview = (dataset.preview || []).slice(0, PREVIEW_ROWS)
  const previewColumns = columns.slice(0, PREVIEW_COLUMNS)
  if (preview.length && previewColumns.length) {
    doc.addPage()
    y = 25
    section('Vista previa de datos')
    table({
      head: [previewColumns.map(text)],
      body: preview.map((row) => previewColumns.map((c) => text(row[c]).slice(0, 24))),
    })
  }

  // Encabezado y pie de cada página
  const pages = doc.getNumberOfPages()
  const height = doc.internal.pageSize.getHeight()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...COLORS.muted)
    doc.text('Reporte Analítico de Datos', MARGIN, 12)
    doc.text(new Date().toLocaleString('es-ES'), width - MARGIN, 12, { align: 'right' })
    doc.setDrawColor(...COLORS.accent).setLineWidth(0.3).line(MARGIN, 14, width - MARGIN, 14)
    doc.text(`Página ${page} de ${pages}`, width - MARGIN, height - 12, { align: 'right' })
    doc.text('Generado con Analyzor', MARGIN, height - 12)
  }

  return doc.output('blob')
}
