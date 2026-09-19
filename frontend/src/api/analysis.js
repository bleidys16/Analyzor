import { getAnalysis } from '../engine/datasetService'
import { call } from './localApi'

export const analysisAPI = {
  getAnalysis: (datasetId) => call(() => getAnalysis(datasetId)),
  autoAnalyze: (datasetId) => call(() => getAnalysis(datasetId, { force: true })),
}
