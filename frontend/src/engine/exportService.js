import { getAnalysis, getDataset } from './datasetService'

// jsPDF pesa bastante: solo se descarga cuando el usuario exporta
export async function exportPdf(datasetId) {
  const [dataset, analysis, { buildReport }] = await Promise.all([
    getDataset(datasetId),
    getAnalysis(datasetId),
    import('./pdf'),
  ])
  return buildReport(dataset, analysis)
}
