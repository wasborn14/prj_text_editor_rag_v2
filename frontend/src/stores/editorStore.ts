import { create } from 'zustand'

interface EditorState {
  selectedFilePath: string | null
  fileContent: string | null
  isLoading: boolean
  isModified: boolean
  currentFileSha: string | null
  setSelectedFile: (path: string | null) => void
  setFileContent: (content: string | null) => void
  setLoading: (loading: boolean) => void
  setIsModified: (modified: boolean) => void
  setCurrentFileSha: (sha: string | null) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  selectedFilePath: null,
  fileContent: null,
  isLoading: false,
  isModified: false,
  currentFileSha: null,
  setSelectedFile: (path) => set({ selectedFilePath: path }),
  setFileContent: (content) => set({ fileContent: content }),
  setLoading: (loading) => set({ isLoading: loading }),
  setIsModified: (modified) => set({ isModified: modified }),
  setCurrentFileSha: (sha) => set({ currentFileSha: sha }),
}))
