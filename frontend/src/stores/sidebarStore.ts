import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'tree' | 'list' | 'bookmarks'

interface SidebarState {
  // 表示状態
  isVisible: boolean
  width: number
  viewMode: ViewMode
  autoHide: boolean

  // ブックマーク機能
  pinnedFiles: string[]

  // 展開されたフォルダ（ツリービュー用）
  expandedFolders: Set<string>

  // ファイル/フォルダ作成
  creatingItem: {
    type: 'file' | 'folder'
    parentPath: string
  } | null

  // コンテキストメニュー
  contextMenu: {
    x: number
    y: number
    targetPath: string
    targetType: 'file' | 'dir'
  } | null

  // アクション
  toggleVisibility: () => void
  setVisibility: (visible: boolean) => void
  setViewMode: (mode: ViewMode) => void
  setWidth: (width: number) => void
  setAutoHide: (autoHide: boolean) => void

  // ブックマーク管理
  togglePin: (filePath: string) => void
  isPinned: (filePath: string) => boolean

  // フォルダ展開管理
  toggleFolder: (folderPath: string) => void
  isExpanded: (folderPath: string) => boolean
  expandFolder: (folderPath: string) => void
  collapseFolder: (folderPath: string) => void

  // ファイル/フォルダ作成管理
  setCreatingItem: (item: { type: 'file' | 'folder', parentPath: string } | null) => void
  cancelCreating: () => void

  // コンテキストメニュー管理
  setContextMenu: (menu: { x: number, y: number, targetPath: string, targetType: 'file' | 'dir' } | null) => void
  closeContextMenu: () => void

  // リセット
  reset: () => void
}

const DEFAULT_WIDTH = 300
const MIN_WIDTH = 200
const MAX_WIDTH = 600

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      // 初期状態
      isVisible: true,
      width: DEFAULT_WIDTH,
      viewMode: 'tree',
      autoHide: false,
      pinnedFiles: [],
      expandedFolders: new Set([]), // ルートフォルダは初期展開
      creatingItem: null,
      contextMenu: null,

      // 表示制御
      toggleVisibility: () =>
        set((state) => ({ isVisible: !state.isVisible })),

      setVisibility: (visible: boolean) =>
        set({ isVisible: visible }),

      setViewMode: (mode: ViewMode) =>
        set({ viewMode: mode }),

      setWidth: (width: number) =>
        set({
          width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
        }),

      setAutoHide: (autoHide: boolean) =>
        set({ autoHide }),

      // ブックマーク管理
      togglePin: (filePath: string) =>
        set((state) => ({
          pinnedFiles: state.pinnedFiles.includes(filePath)
            ? state.pinnedFiles.filter(path => path !== filePath)
            : [...state.pinnedFiles, filePath]
        })),

      isPinned: (filePath: string) =>
        get().pinnedFiles.includes(filePath),

      // フォルダ展開管理
      toggleFolder: (folderPath: string) =>
        set((state) => {
          const newExpanded = new Set(state.expandedFolders)
          if (newExpanded.has(folderPath)) {
            newExpanded.delete(folderPath)
          } else {
            newExpanded.add(folderPath)
          }
          return { expandedFolders: newExpanded }
        }),

      isExpanded: (folderPath: string) =>
        get().expandedFolders.has(folderPath),

      expandFolder: (folderPath: string) =>
        set((state) => ({
          expandedFolders: new Set([...state.expandedFolders, folderPath])
        })),

      collapseFolder: (folderPath: string) =>
        set((state) => {
          const newExpanded = new Set(state.expandedFolders)
          newExpanded.delete(folderPath)
          return { expandedFolders: newExpanded }
        }),

      // ファイル/フォルダ作成管理
      setCreatingItem: (item) =>
        set({ creatingItem: item }),

      cancelCreating: () =>
        set({ creatingItem: null }),

      // コンテキストメニュー管理
      setContextMenu: (menu) =>
        set({ contextMenu: menu }),

      closeContextMenu: () =>
        set({ contextMenu: null }),

      // リセット
      reset: () =>
        set({
          isVisible: true,
          width: DEFAULT_WIDTH,
          viewMode: 'tree',
          autoHide: false,
          pinnedFiles: [],
          expandedFolders: new Set([]),
          creatingItem: null,
          contextMenu: null
        })
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({
        isVisible: state.isVisible,
        width: state.width,
        viewMode: state.viewMode,
        autoHide: state.autoHide,
        pinnedFiles: state.pinnedFiles,
        // Set は serialize できないので配列に変換
        expandedFolders: Array.from(state.expandedFolders)
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 配列から Set に復元
          state.expandedFolders = new Set(state.expandedFolders as unknown as string[])
        }
      }
    }
  )
)

// キーボードショートカット用フック
export const useSidebarKeyboard = () => {
  const { toggleVisibility, setViewMode } = useSidebarStore()

  const handleKeyboard = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          toggleVisibility()
          break
        case '1':
          e.preventDefault()
          setViewMode('tree')
          break
        case '2':
          e.preventDefault()
          setViewMode('list')
          break
        case '3':
          e.preventDefault()
          setViewMode('bookmarks')
          break
      }
    }
  }

  return { handleKeyboard }
}