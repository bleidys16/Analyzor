import client from './client'

export const analysisAPI = {
    // Auto-analyze dataset
    autoAnalyze: async (datasetId) => {
        return client.post(`/analysis/auto-analyze/`, { dataset_id: datasetId })
    },

    // Get analysis for dataset
    getAnalysis: async (datasetId) => {
        return client.get(`/analysis/${datasetId}/`)
    },

    // Execute SQL query
    executeSQL: async (datasetId, sql) => {
        return client.post('/analysis/query/', {
            dataset_id: datasetId,
            sql,
        })
    },

    // Convert natural language to SQL
    nlToSQL: async (datasetId, question) => {
        return client.post('/analysis/sql-from-nl/', {
            dataset_id: datasetId,
            question,
        })
    },
}