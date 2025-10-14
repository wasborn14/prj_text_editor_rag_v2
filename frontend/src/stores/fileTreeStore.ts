import { create } from 'zustand'
import { FileTreeItem } from '@/lib/github'

interface FileTreeState {
  // ローカルで管理するファイルツリー（ドラッグ&ドロップで変更可能）
  localFileTree: FileTreeItem[]
  setLocalFileTree: (fileTree: FileTreeItem[]) => void

  // 空のディレクトリ
  emptyDirectories: Set<string>
  setEmptyDirectories: (updater: (prev: Set<string>) => Set<string>) => void

  // 展開されているディレクトリ
  expandedDirs: Set<string>
  toggleDirectory: (path: string) => void
  setExpandedDirs: (updater: (prev: Set<string>) => Set<string>) => void

  // 選択されているアイテム
  selectedPaths: Set<string>
  setSelectedPaths: (updater: (prev: Set<string>) => Set<string>) => void
  clearSelection: () => void

  // リセット
  resetFileTree: () => void
}

export const useFileTreeStore = create<FileTreeState>((set) => ({
  localFileTree: [],
  setLocalFileTree: (fileTree) => set({ localFileTree: fileTree }),

  emptyDirectories: new Set(),
  setEmptyDirectories: (updater) =>
    set((state) => ({ emptyDirectories: updater(state.emptyDirectories) })),

  expandedDirs: new Set(),
  toggleDirectory: (path) =>
    set((state) => {
      const newExpanded = new Set(state.expandedDirs)
      if (newExpanded.has(path)) {
        newExpanded.delete(path)
      } else {
        newExpanded.add(path)
      }
      return { expandedDirs: newExpanded }
    }),
  setExpandedDirs: (updater) =>
    set((state) => ({ expandedDirs: updater(state.expandedDirs) })),

  selectedPaths: new Set(),
  setSelectedPaths: (updater) =>
    set((state) => ({ selectedPaths: updater(state.selectedPaths) })),
  clearSelection: () => set({ selectedPaths: new Set() }),

  resetFileTree: () =>
    set({
      localFileTree: [],
      emptyDirectories: new Set(),
      expandedDirs: new Set(),
      selectedPaths: new Set(),
    }),
}))
