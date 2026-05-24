import client from './client'

export const modelsAPI = {
    // Train a model
    train: async (datasetId, modelType, targetColumn) => {
        return client.post('/models/train/', {
            dataset_id: datasetId,
            model_type: modelType,
            target_column: targetColumn,
        })
    },

    // Get all models
    getAll: async () => {
        return client.get('/models/')
    },

    // Get specific model
    getById: async (id) => {
        return client.get(`/models/${id}/`)
    },

    // Make prediction
    predict: async (modelId, features) => {
        return client.post(`/models/${modelId}/predict/`, {
            features,
        })
    },

    // Delete model
    delete: async (id) => {
        return client.delete(`/models/${id}/`)
    },
}