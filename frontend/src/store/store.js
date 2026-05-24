import { create } from 'zustand'

export const useStore = create((set) => ({
  // Session
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  // Current dataset
  currentDataset: null,
  setCurrentDataset: (dataset) => set({ currentDataset: dataset }),

  // Analysis data
  analysisData: null,
  setAnalysisData: (data) => set({ analysisData: data }),

  // Models
  models: [],
  setModels: (models) => set({ models }),

  // Chat messages
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  clearChat: () => set({ chatMessages: [] }),
}))