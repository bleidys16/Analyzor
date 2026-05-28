import client from './client'

export const analysisAPI = {
  autoAnalyze: async (datasetId) => {
    return client.post('/analysis/auto-analyze/', { dataset_id: datasetId })
  },

  getAnalysis: async (datasetId) => {
    return client.get(`/analysis/${datasetId}/`)
  },

  executeSQL: async (datasetId, sql) => {
    return client.post('/analysis/query/', {
      dataset_id: datasetId,
      sql,
    })
  },

  getDistributions: async (datasetId) => {
    return client.post('/analysis/distributions/', { dataset_id: datasetId })
  },
}