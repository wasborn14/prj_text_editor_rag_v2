'use client'

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface EditorTab {
  id: string
  path: string
  name: string
  content: string
  isDirty: boolean
  language: string
  isLoading: boolean
}

interface EditorState {
  openTabs: EditorTab[]
  activeTabId: string | null

  // タブ管理
  openFile: (file: { path: string; name: string; type: string }) => void
  closeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  closeAllTabs: () => void

  // ファイル操作
  updateContent: (tabId: string, content: string) => void
  setLoading: (tabId: string, loading: boolean) => void
  markSaved: (tabId: string) => void

  // ヘルパー
  getActiveTab: () => EditorTab | null
  getTabById: (tabId: string) => EditorTab | null
  isTabOpen: (path: string) => boolean
}

// ファイル拡張子から言語を判定
const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'js': return 'javascript'
    case 'jsx': return 'javascript'
    case 'ts': return 'typescript'
    case 'tsx': return 'typescript'
    case 'json': return 'json'
    case 'md': return 'markdown'
    case 'css': return 'css'
    case 'scss': return 'scss'
    case 'html': return 'html'
    case 'py': return 'python'
    case 'yml':
    case 'yaml': return 'yaml'
    case 'xml': return 'xml'
    case 'sql': return 'sql'
    case 'sh': return 'shell'
    case 'dockerfile': return 'dockerfile'
    default: return 'plaintext'
  }
}

// ファイルパスから一意のIDを生成
const generateTabId = (path: string): string => {
  return `tab-${path.replace(/[^a-zA-Z0-9]/g, '-')}`
}

export const useEditorStore = create<EditorState>()(
  devtools(
    (set, get) => ({
      openTabs: [],
      activeTabId: null,

      openFile: (file) => {
        const { openTabs } = get()
        const tabId = generateTabId(file.path)

        // 既に開いているタブがあるかチェック
        const existingTab = openTabs.find(tab => tab.id === tabId)
        if (existingTab) {
          set({ activeTabId: tabId })
          return
        }

        // 新しいタブを作成
        const newTab: EditorTab = {
          id: tabId,
          path: file.path,
          name: file.name,
          content: '',
          isDirty: false,
          language: getLanguageFromPath(file.path),
          isLoading: true
        }

        set({
          openTabs: [...openTabs, newTab],
          activeTabId: tabId
        })
      },

      closeTab: (tabId) => {
        const { openTabs, activeTabId } = get()
        const updatedTabs = openTabs.filter(tab => tab.id !== tabId)

        let newActiveTabId = activeTabId

        // 閉じるタブがアクティブだった場合、別のタブをアクティブにする
        if (activeTabId === tabId) {
          if (updatedTabs.length > 0) {
            // 右側のタブがあれば選択、なければ一番右のタブを選択
            const closedTabIndex = openTabs.findIndex(tab => tab.id === tabId)
            if (closedTabIndex < updatedTabs.length) {
              newActiveTabId = updatedTabs[closedTabIndex].id
            } else {
              newActiveTabId = updatedTabs[updatedTabs.length - 1].id
            }
          } else {
            newActiveTabId = null
          }
        }

        set({
          openTabs: updatedTabs,
          activeTabId: newActiveTabId
        })
      },

      setActiveTab: (tabId) => {
        set({ activeTabId: tabId })
      },

      closeAllTabs: () => {
        set({
          openTabs: [],
          activeTabId: null
        })
      },

      updateContent: (tabId, content) => {
        const { openTabs } = get()
        const updatedTabs = openTabs.map(tab => {
          if (tab.id === tabId) {
            return {
              ...tab,
              content,
              isDirty: true,
              isLoading: false // コンテンツ更新時にローディング終了
            }
          }
          return tab
        })

        set({ openTabs: updatedTabs })
      },

      setLoading: (tabId, loading) => {
        const { openTabs } = get()
        const updatedTabs = openTabs.map(tab => {
          if (tab.id === tabId) {
            return { ...tab, isLoading: loading }
          }
          return tab
        })

        set({ openTabs: updatedTabs })
      },

      markSaved: (tabId) => {
        const { openTabs } = get()
        const updatedTabs = openTabs.map(tab => {
          if (tab.id === tabId) {
            return { ...tab, isDirty: false }
          }
          return tab
        })

        set({ openTabs: updatedTabs })
      },

      // ヘルパーメソッド
      getActiveTab: () => {
        const { openTabs, activeTabId } = get()
        return openTabs.find(tab => tab.id === activeTabId) || null
      },

      getTabById: (tabId) => {
        const { openTabs } = get()
        return openTabs.find(tab => tab.id === tabId) || null
      },

      isTabOpen: (path) => {
        const { openTabs } = get()
        return openTabs.some(tab => tab.path === path)
      }
    }),
    {
      name: 'editor-store'
    }
  )
)