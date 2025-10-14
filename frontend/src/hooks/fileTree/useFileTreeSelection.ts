import { useState, useCallback } from 'react'
import { TreeNode, SelectionHandlers } from '@/lib/fileTree/types'

/**
 * ファイルツリーの選択機能を管理するカスタムフック
 * - 単一選択（通常クリック）
 * - 複数選択（Ctrl/Cmd + クリック）
 * - 範囲選択（Shift + クリック）
 */
export function useFileTreeSelection(flatTree: TreeNode[]): SelectionHandlers {
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null)

  const handleItemClick = useCallback(
    (path: string, event: React.MouseEvent) => {
      event.stopPropagation()

      if (event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd+クリック: トグル選択
        setSelectedPaths((prev) => {
          const newSelected = new Set(prev)
          if (newSelected.has(path)) {
            newSelected.delete(path)
          } else {
            newSelected.add(path)
          }
          return newSelected
        })
        setLastSelectedPath(path)
      } else if (event.shiftKey && lastSelectedPath) {
        // Shift+クリック: 範囲選択
        const startIndex = flatTree.findIndex((n) => n.fullPath === lastSelectedPath)
        const endIndex = flatTree.findIndex((n) => n.fullPath === path)

        if (startIndex !== -1 && endIndex !== -1) {
          const [start, end] =
            startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
          const rangeItems = flatTree.slice(start, end + 1).map((n) => n.fullPath)
          setSelectedPaths(new Set(rangeItems))
        }
      } else {
        // 通常クリック: 単一選択
        setSelectedPaths(new Set([path]))
        setLastSelectedPath(path)
      }
    },
    [lastSelectedPath, flatTree]
  )

  const clearSelection = useCallback(() => {
    setSelectedPaths(new Set())
    setLastSelectedPath(null)
  }, [])

  return {
    selectedPaths,
    lastSelectedPath,
    handleItemClick,
    clearSelection,
    setSelectedPaths,
  }
}
