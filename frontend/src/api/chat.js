import client from './client'

export const chatAPI = {
    // Send message
    sendMessage: async (datasetId, message) => {
        return client.post('/chat/message/', {
            dataset_id: datasetId,
            content: message,
        })
    },

    // Get chat history
    getHistory: async (datasetId) => {
        return client.get(`/chat/history/?dataset_id=${datasetId}`)
    },

    // Clear chat
    clearChat: async (datasetId) => {
        return client.delete('/chat/clear/', {
            data: { dataset_id: datasetId },
        })
    },
}