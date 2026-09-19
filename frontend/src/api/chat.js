import { clearHistory, getHistory, sendMessage } from '../engine/chatService'
import { call } from './localApi'

export const chatAPI = {
  sendMessage: (datasetId, message) => call(() => sendMessage(datasetId, message)),
  getHistory: (datasetId) => call(() => getHistory(datasetId)),
  clearChat: (datasetId) => call(() => clearHistory(datasetId)),
}
