import { exportPdf } from '../engine/exportService'
import { call } from './localApi'

export const exportAPI = {
  exportPDF: (datasetId) => call(() => exportPdf(datasetId)),
}
