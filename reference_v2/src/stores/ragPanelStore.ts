'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

type RAGTab = 'search' | 'chat' | 'sync'

interface RAGPanelState {
  isVisible: boolean
  width: number
  activeTab: RAGTab

  // Actions
  togglePanel: () => void
  setVisible: (visible: boolean) => void
  setWidth: (width: number) => void
  setActiveTab: (tab: RAGTab) => void
}

export const useRAGPanelStore = create<RAGPanelState>()(
  devtools(
    persist(
      (set) => ({
        isVisible: false,
        width: 400,
        activeTab: 'search',

        togglePanel: () => set((state) => ({ isVisible: !state.isVisible })),
        setVisible: (visible) => set({ isVisible: visible }),
        setWidth: (width) => {
          // 幅を300px〜800pxに制限
          const clampedWidth = Math.min(Math.max(width, 300), 800)
          set({ width: clampedWidth })
        },
        setActiveTab: (tab) => set({ activeTab: tab })
      }),
      {
        name: 'rag-panel-storage',
        partialize: (state) => ({
          width: state.width,
          activeTab: state.activeTab
        })
      }
    ),
    {
      name: 'rag-panel-store'
    }
  )
)
