'use client'

import React, { useState, useMemo, useCallback } from 'react'
import '@/styles/FileTreePanel.css'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { FolderOpen, File, Loader2 } from 'lucide-react'
import { FileTreeItem as GitHubFileTreeItem } from '@/lib/github'
import {
  FileTreePanelProps,
  buildTreeStructure,
  flattenTree,
  DUMMY_FILE_TREE,
  DUMMY_EMPTY_DIRS,
} from '@/lib/fileTree'
import { useFileTreeSelection, useFileTreeDragDrop } from '@/hooks/fileTree'
import { FileTreeItem } from './FileTreeItem'

/**
 * ファイルツリーパネルのメインコンポーネント
 */
export function FileTreePanel({
  selectedRepo,
  fileTree: propFileTree,
  treeLoading,
  error,
  useDummyData = true,
}: FileTreePanelProps) {
  // ダミーデータ用のローカルステート
  const [fileTree, setFileTree] = useState<GitHubFileTreeItem[]>(
    useDummyData ? DUMMY_FILE_TREE : propFileTree
  )
  const [emptyDirectories, setEmptyDirectories] = useState<Set<string>>(DUMMY_EMPTY_DIRS)
  const [localExpandedDirs, setLocalExpandedDirs] = useState<Set<string>>(new Set([]))

  // ツリー構造を構築
  const tree = useMemo(
    () => buildTreeStructure(fileTree, emptyDirectories),
    [fileTree, emptyDirectories]
  )
  const flatTree = useMemo(
    () => flattenTree(tree, localExpandedDirs),
    [tree, localExpandedDirs]
  )

  // ディレクトリの展開/折りたたみ
  const handleToggle = useCallback((path: string) => {
    setLocalExpandedDirs((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(path)) {
        newExpanded.delete(path)
      } else {
        newExpanded.add(path)
      }
      return newExpanded
    })
  }, [])

  // 選択機能のカスタムフック
  const selection = useFileTreeSelection(flatTree)

  // ドラッグ&ドロップ機能のカスタムフック
  const dragDrop = useFileTreeDragDrop({
    flatTree,
    fileTree,
    selectedPaths: selection.selectedPaths,
    emptyDirectories,
    localExpandedDirs,
    setFileTree,
    setEmptyDirectories,
    setLocalExpandedDirs,
    setSelectedPaths: () => {
      // Note: setSelectedPathsはselection内部で管理されているため直接更新不可
      // この問題は後で修正が必要
    },
  })

  // activeNodeの取得
  const activeNode = useMemo(
    () => flatTree.find((node) => node.fullPath === dragDrop.activeId),
    [flatTree, dragDrop.activeId]
  )

  // overNodeの取得
  const overNode = useMemo(
    () => flatTree.find((n) => n.fullPath === dragDrop.overId),
    [flatTree, dragDrop.overId]
  )

  return (
    <div
      ref={dragDrop.containerRef}
      className="file-tree-container w-80 flex-shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          ファイル一覧
        </h2>
        {useDummyData && (
          <span className="text-xs text-orange-500 font-medium">ダミーデータ</span>
        )}
      </div>

      {!selectedRepo && !useDummyData && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          リポジトリを選択してください
        </p>
      )}

      {selectedRepo && treeLoading && !useDummyData && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          読み込み中...
        </div>
      )}

      <DndContext
        sensors={dragDrop.sensors}
        collisionDetection={closestCenter}
        onDragStart={dragDrop.handleDragStart}
        onDragOver={dragDrop.handleDragOver}
        onDragMove={dragDrop.handleDragMove}
        onDragEnd={dragDrop.handleDragEnd}
      >
        <SortableContext
          items={flatTree.map((node) => node.fullPath)}
          strategy={verticalListSortingStrategy}
        >
          {(useDummyData || (selectedRepo && !treeLoading && fileTree.length > 0)) && (
            <div className="space-y-0.5">
              {flatTree.map((node) => {
                const isInDragOverDir =
                  overNode?.type === 'dir' &&
                  dragDrop.overId !== null &&
                  (node.fullPath === dragDrop.overId ||
                    node.fullPath.startsWith(dragDrop.overId + '/'))

                return (
                  <FileTreeItem
                    key={node.fullPath}
                    node={node}
                    isExpanded={localExpandedDirs.has(node.fullPath)}
                    isSelected={selection.selectedPaths.has(node.fullPath)}
                    onToggle={() => handleToggle(node.fullPath)}
                    onItemClick={(e) => selection.handleItemClick(node.fullPath, e)}
                    isDragOver={dragDrop.overId === node.fullPath}
                    isInDragOverDirectory={isInDragOverDir}
                  />
                )
              })}
            </div>
          )}
        </SortableContext>

        <DragOverlay>
          {activeNode && (
            <div className="flex items-center gap-2 rounded bg-white px-2 py-1 shadow-lg dark:bg-gray-800 border border-gray-300 dark:border-gray-600">
              {activeNode.type === 'dir' ? (
                <FolderOpen className="h-4 w-4 text-blue-500" />
              ) : (
                <File className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {activeNode.name}
              </span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {!useDummyData &&
        selectedRepo &&
        !treeLoading &&
        fileTree.length === 0 &&
        !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ファイルが見つかりませんでした
          </p>
        )}
    </div>
  )
}
