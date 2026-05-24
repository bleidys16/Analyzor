import client from './client'

export const datasetsAPI = {
  upload: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post('/datasets/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getById: async (id) => {
    return client.get(`/datasets/${id}/`)
  },

  getAll: async () => {
    return client.get('/datasets/')
  },

  delete: async (id) => {
    return client.delete(`/datasets/${id}/`)
  },
}