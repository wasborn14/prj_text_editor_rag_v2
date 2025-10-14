import { create } from 'zustand'

interface EditorState {
  selectedFilePath: string | null
  fileContent: string | null
  isLoading: boolean
  setSelectedFile: (path: string | null) => void
  setFileContent: (content: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  selectedFilePath: null,
  fileContent: null,
  isLoading: false,
  setSelectedFile: (path) => set({ selectedFilePath: path }),
  setFileContent: (content) => set({ fileContent: content }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
