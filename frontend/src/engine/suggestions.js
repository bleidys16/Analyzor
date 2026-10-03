import { isIdColumn } from './values'

const MAX_GROUPS = 12

// Preguntas de ejemplo construidas con las columnas reales del dataset, redactadas para que también
// las resuelva el motor de reglas (así funcionan sin IA).
export function buildSuggestions(dataset, analysis) {
  const columns = dataset?.columns || []
  const dtypes = dataset?.dtypes || {}
  const quality = analysis?.data_quality || {}

  const numeric = columns.filter((c) => ['integer', 'float'].includes(dtypes[c]) && !isIdColumn(c))
  const categorical = columns.filter((c) => {
    if (dtypes[c] !== 'string' || isIdColumn(c)) return false
    const unique = quality[c]?.unique_count
    return unique === undefined || (unique >= 2 && unique <= MAX_GROUPS)
  })

  const [num, num2] = numeric
  const cat = categorical[0]
  const cat2 = categorical[1]
  const hasDate = columns.some((c) => dtypes[c] === 'datetime')
  const suggestions = []

  if (num && cat) suggestions.push(`Promedio de ${num} por ${cat}`)
  if (cat) suggestions.push(`¿Cuántos registros hay por ${cat}?`)
  if (num && hasDate) suggestions.push(`Evolución de ${num} por mes`)
  if (num2 || num) suggestions.push(`¿Cuál es el máximo de ${num2 || num}?`)
  if (cat) suggestions.push(`Gráfico de torta de ${cat}`)
  if (num && cat2) suggestions.push(`Suma de ${num} por ${cat2}`)

  // Máximo 6: las 5 primeras y siempre la pregunta genérica al final
  return [...suggestions.slice(0, 5), 'Muéstrame los primeros datos']
}
