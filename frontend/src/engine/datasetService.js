import { CsvError, toUtf8 } from './csv'
import { previewRows, profileTable } from './profile'
import { forget, runOnDataset, runOnNewFile } from './session'
import { datasetStore, requestPersistence } from './store'

// Un navegador no aguanta datasets enormes en memoria: se avisa en vez de colgarse
export const MAX_FILE_BYTES = 200 * 1024 * 1024

export class NotFoundError extends Error {}
export class UploadError extends Error {}

// La lista solo necesita metadatos: la vista previa y el análisis pesan más
const withoutHeavyFields = (meta) => {
  const light = { ...meta }
  delete light.preview
  delete light.analysis
  return light
}

export async function uploadDataset(file) {
  if (!file || !/\.csv$/i.test(file.name)) throw new UploadError('Solo se permiten archivos .csv')
  if (file.size === 0) throw new UploadError('El archivo está vacío')
  if (file.size > MAX_FILE_BYTES) {
    throw new UploadError(`El archivo supera el máximo de ${MAX_FILE_BYTES / 1024 / 1024} MB`)
  }

  const bytes = toUtf8(new Uint8Array(await file.arrayBuffer()))
  const id = crypto.randomUUID()

  const meta = await runOnNewFile(id, bytes, async (runner, { schema, rowsCount }) => {
    if (rowsCount === 0) throw new UploadError('El CSV no tiene filas de datos')
    return {
      id,
      name: file.name.replace(/\.csv$/i, ''),
      columns: schema.map((c) => c.name),
      dtypes: Object.fromEntries(schema.map((c) => [c.name, c.dtype])),
      rows_count: rowsCount,
      file_size: file.size,
      created_at: new Date().toISOString(),
      preview: await previewRows(runner),
      analysis: await profileTable(runner, schema),
    }
  }).catch((err) => {
    if (err instanceof CsvError) throw new UploadError(err.message)
    throw err
  })

  try {
    await datasetStore.put(meta, bytes)
  } catch (err) {
    forget(id)
    if (err?.name === 'QuotaExceededError') {
      throw new UploadError('No hay espacio suficiente en el navegador para guardar este archivo')
    }
    throw err
  }
  requestPersistence()
  return meta
}

export async function listDatasets() {
  return (await datasetStore.list()).map(withoutHeavyFields)
}

export async function getDataset(id) {
  const meta = await datasetStore.get(id)
  if (!meta) throw new NotFoundError('Dataset no encontrado')
  const dataset = { ...meta }
  delete dataset.analysis
  return dataset
}

export async function deleteDataset(id) {
  forget(id)
  await datasetStore.remove(id)
}

// Devuelve el análisis guardado; si no existe (o se pide `force`) lo recalcula
export async function getAnalysis(id, { force = false } = {}) {
  const meta = await datasetStore.get(id)
  if (!meta) throw new NotFoundError('Dataset no encontrado')
  if (meta.analysis && !force) return meta.analysis

  const analysis = await runOnDataset(id, (runner) => profileTable(runner))
  await datasetStore.put({ ...meta, analysis })
  return analysis
}
