import { create } from 'zustand'

export const useStore = create((set) => ({
  // Current dataset
  currentDataset: null,
  setCurrentDataset: (dataset) => set({ currentDataset: dataset }),

  // Analysis data
  analysisData: null,
  setAnalysisData: (data) => set({ analysisData: data }),

  // Chat messages
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  clearChat: () => set({ chatMessages: [] }),
}))
