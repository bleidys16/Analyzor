import client from './client'

export const exportAPI = {
    // Export to PDF
    exportPDF: async (datasetId, analysisData) => {
        return client.post(
            '/export/pdf/',
            { dataset_id: datasetId, ...analysisData },
            { responseType: 'blob' }
        )
    },

    // Export to CSV
    exportCSV: async (datasetId, queryResult) => {
        return client.post(
            '/export/csv/',
            { dataset_id: datasetId, data: queryResult },
            { responseType: 'blob' }
        )
    },
}