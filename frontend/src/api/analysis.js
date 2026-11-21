import { getAnalysis } from '../engine/datasetService'
import { runOnDataset } from '../engine/session'
import { buildAutoCharts } from '../engine/autoCharts'
import { call } from './localApi'

export const analysisAPI = {
  getAnalysis: (datasetId) => call(() => getAnalysis(datasetId)),
  autoAnalyze: (datasetId) => call(() => getAnalysis(datasetId, { force: true })),
  getAutoCharts: (datasetId, analysis) => call(() => runOnDataset(datasetId, (runner) => buildAutoCharts(runner, analysis))),
}
