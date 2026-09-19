// Elige un gráfico para el resultado de una consulta.
// Formas que entiende ChatMessages.jsx: bar/pie -> [{name, value}], scatter -> [{x, y}],
// histogram -> [{range, count}], text -> sin gráfico.

const isNum = (v) => typeof v === 'number'
const label = (v) => String(v ?? 'N/A').slice(0, 20)

// `listing`: la consulta es un SELECT * (filas crudas, no una agregación)
export function detectChartType(data, columns, { listing = false } = {}) {
  if (!data || data.length === 0) return { type: 'text', message: 'Sin datos para visualizar' }
  if (listing) return { type: 'text', message: 'Listado de registros' }

  const numericCols = []
  const categoricalCols = []
  for (const col of columns) {
    const values = data.map((row) => row[col]).filter((v) => v !== null && v !== undefined)
    if (values.length === 0) continue
    if (values.every(isNum)) numericCols.push(col)
    else categoricalCols.push(col)
  }

  // Un listado de filas (SELECT * ...) no es una agregación: no hay nada útil que graficar
  if (columns.length > 3 && data.length > 1) return { type: 'text', message: 'Listado de registros' }

  if (categoricalCols.length >= 1 && numericCols.length >= 1) {
    if (data.length === 1) return { type: 'text', message: 'Resultado único' }
    return data.length <= 8
      ? pieChart(data, categoricalCols[0], numericCols[0])
      : barChart(data, categoricalCols[0], numericCols[0])
  }
  if (categoricalCols.length >= 1) return pieChart(data, categoricalCols[0], null)

  if (numericCols.length >= 2) {
    // Una sola fila con varias métricas (promedios de varias columnas): barras por métrica
    if (data.length === 1) return metricsChart(data[0], numericCols)
    return scatterChart(data, numericCols[0], numericCols[1])
  }
  if (numericCols.length === 1) return distributionChart(data, numericCols[0])

  return { type: 'text', message: 'No se puede generar gráfico con estos datos' }
}

function pieChart(data, catCol, numCol) {
  return {
    type: 'pie',
    title: numCol ? `${numCol} por ${catCol}` : `Distribución de ${catCol}`,
    data: data.slice(0, 12).map((row) => ({
      name: label(row[catCol]),
      value: numCol && isNum(row[numCol]) ? row[numCol] : 1,
    })),
  }
}

function barChart(data, xCol, yCol) {
  return {
    type: 'bar',
    title: `${yCol} por ${xCol}`,
    data: data.slice(0, 20).map((row) => ({
      name: label(row[xCol]),
      value: isNum(row[yCol]) ? row[yCol] : 0,
    })),
    x_axis: xCol,
    y_axis: yCol,
  }
}

function metricsChart(row, numericCols) {
  return {
    type: 'bar',
    title: 'Métricas',
    data: numericCols.slice(0, 20).map((col) => ({ name: label(col), value: row[col] })),
    x_axis: 'Métrica',
    y_axis: 'Valor',
  }
}

function scatterChart(data, xCol, yCol) {
  return {
    type: 'scatter',
    title: `${yCol} vs ${xCol}`,
    data: data
      .slice(0, 50)
      .filter((row) => isNum(row[xCol]) && isNum(row[yCol]))
      .map((row) => ({ x: row[xCol], y: row[yCol] })),
    x_axis: xCol,
    y_axis: yCol,
  }
}

function distributionChart(data, col) {
  const values = data.map((row) => row[col]).filter(isNum)
  if (values.length === 0) return { type: 'text', message: `No hay valores numéricos en ${col}` }
  if (values.length === 1) {
    return {
      type: 'bar',
      title: col.replace(/_/g, ' '),
      data: [{ name: col.replace(/_/g, ' '), value: values[0] }],
      x_axis: 'Métrica',
      y_axis: 'Valor',
    }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const binCount = Math.min(10, new Set(values).size)
  const binSize = max !== min ? (max - min) / binCount : 1
  const counts = new Array(binCount).fill(0)
  for (const v of values) {
    counts[Math.min(Math.floor((v - min) / binSize), binCount - 1)]++
  }
  const decimals = binSize >= 1 ? 1 : binSize >= 0.1 ? 2 : 4

  return {
    type: 'histogram',
    title: `Distribución de ${col}`,
    data: counts.map((count, i) => ({ range: (min + i * binSize).toFixed(decimals), count })),
    column: col,
  }
}
