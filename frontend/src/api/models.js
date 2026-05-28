import client from './client'

export const modelsAPI = {
  train: async (datasetId, targetColumn, modelType = 'random_forest') => {
    return client.post('/models/train/', {
      dataset_id: datasetId,
      target_column: targetColumn,
      model_type: modelType,
    })
  },

  getAll: async (datasetId) => {
    return client.get(`/models/?dataset_id=${datasetId}`)
  },
}