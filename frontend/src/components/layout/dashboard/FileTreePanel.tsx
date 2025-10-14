'use client'

import React, { useMemo } from 'react'
import '@/styles/FileTreePanel.css'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Loader2 } from 'lucide-react'
import {
  FileTreePanelProps,
  buildTreeStructure,
  flattenTree,
  isNodeInDragOverDirectory,
} from '@/lib/fileTree'
import { useFileTreeSelection, useFileTreeDragDrop } from '@/hooks/fileTree'
import { useFileTreeStore } from '@/stores/fileTreeStore'
import { FileTreeItem } from './FileTreeItem'
import { DragOverlayItem } from './DragOverlayItem'

/**
 * ファイルツリーパネルのメインコンポーネント
 */
export function FileTreePanel({
  selectedRepo,
  treeLoading,
  error,
}: FileTreePanelProps) {
  // Zustandストアから状態を取得
  const {
    localFileTree,
    setLocalFileTree,
    emptyDirectories,
    setEmptyDirectories,
    expandedDirs,
    toggleDirectory,
    setExpandedDirs,
  } = useFileTreeStore()

  // ツリー構造を構築
  const tree = useMemo(
    () => buildTreeStructure(
      localFileTree,
      emptyDirectories,
      selectedRepo?.name
    ),
    [localFileTree, emptyDirectories, selectedRepo?.name]
  )
  const flatTree = useMemo(
    () => flattenTree(tree, expandedDirs),
    [tree, expandedDirs]
  )

  // 選択機能のカスタムフック
  const selection = useFileTreeSelection(flatTree)

  // ドラッグ&ドロップ機能のカスタムフック
  const dragDrop = useFileTreeDragDrop({
    flatTree,
    fileTree: localFileTree,
    selectedPaths: selection.selectedPaths,
    emptyDirectories,
    localExpandedDirs: expandedDirs,
    setFileTree: setLocalFileTree,
    setEmptyDirectories,
    setLocalExpandedDirs: setExpandedDirs,
    setSelectedPaths: selection.setSelectedPaths,
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
      </div>

      {!selectedRepo && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          リポジトリを選択してください
        </p>
      )}

      {selectedRepo && treeLoading && (
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
          {selectedRepo && !treeLoading && localFileTree.length > 0 && (
            <div className="space-y-0.5">
              {flatTree.map((node) => (
                <FileTreeItem
                  key={node.fullPath}
                  node={node}
                  isExpanded={expandedDirs.has(node.fullPath)}
                  isSelected={selection.selectedPaths.has(node.fullPath)}
                  onToggle={() => toggleDirectory(node.fullPath)}
                  onItemClick={(e) => selection.handleItemClick(node.fullPath, e)}
                  isDragOver={dragDrop.overId === node.fullPath}
                  isInDragOverDirectory={isNodeInDragOverDirectory(
                    node,
                    dragDrop.overId,
                    overNode
                  )}
                />
              ))}
            </div>
          )}
        </SortableContext>

        <DragOverlay>
          {activeNode && <DragOverlayItem node={activeNode} />}
        </DragOverlay>
      </DndContext>

      {selectedRepo && !treeLoading && localFileTree.length === 0 && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ファイルが見つかりませんでした
        </p>
      )}
    </div>
  )
}
