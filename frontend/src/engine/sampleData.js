import { UploadError, getDataset, listDatasets, uploadDataset } from './datasetService'

export const SAMPLE_FILE = 'ejemplo_ventas.csv'
export const SAMPLE_NAME = 'ejemplo_ventas'
export const SAMPLE_URL = `${import.meta.env?.BASE_URL || '/'}${SAMPLE_FILE}`

// Carga el dataset de ejemplo. Si ya existe uno en este navegador se reutiliza en vez de duplicarlo.
export async function loadSampleDataset({ fetchImpl } = {}) {
  const existing = (await listDatasets()).find((d) => d.name === SAMPLE_NAME)
  if (existing) return getDataset(existing.id)

  let res
  try {
    res = await (fetchImpl || fetch)(SAMPLE_URL)
  } catch {
    throw new UploadError('No se pudo descargar el dataset de ejemplo. Revisa tu conexión.')
  }
  if (!res.ok) throw new UploadError('No se pudo descargar el dataset de ejemplo.')
  return uploadDataset(new File([await res.blob()], SAMPLE_FILE, { type: 'text/csv' }))
}
