'use client'

import React, { useMemo } from 'react'
import '@/styles/FileTreePanel.css'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Loader2 } from 'lucide-react'
import {
  buildTreeStructure,
  flattenTree,
  isNodeInDragOverDirectory,
} from '@/lib/fileTree'
import { useFileTreeSelection, useFileTreeDragDrop } from '@/hooks/fileTree'
import { useFileTreeStore } from '@/stores/fileTreeStore'
import { useAuthStore } from '@/stores/authStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { FileTreeItem } from './FileTreeItem'
import { DragOverlayItem } from './DragOverlayItem'
import { Repository } from '@/lib/github'

interface FileTreePanelProps {
  repositories: Repository[]
  selectedRepo: Repository | null
  repoLoading: boolean
  treeLoading: boolean
  error: string | null
  onRepoChange: (repoFullName: string) => void
}

/**
 * ファイルツリーパネルのメインコンポーネント（サイドバー対応）
 */
export function FileTreePanel({
  repositories,
  selectedRepo,
  repoLoading,
  treeLoading,
  error,
  onRepoChange,
}: FileTreePanelProps) {
  const { isOpen, close } = useSidebarStore()

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

  // GitHubトークンを取得
  const githubToken = useAuthStore((state) => state.githubToken)

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
    repository: selectedRepo,
    githubToken,
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

  // モバイルでファイル選択時にサイドバーを閉じる
  const handleItemClick = (fullPath: string, e: React.MouseEvent) => {
    selection.handleItemClick(fullPath, e)

    // モバイルの場合のみ閉じる
    if (window.innerWidth < 768) {
      close()
    }
  }

  return (
    <DndContext
      sensors={dragDrop.sensors}
      collisionDetection={closestCenter}
      onDragStart={dragDrop.handleDragStart}
      onDragOver={dragDrop.handleDragOver}
      onDragMove={dragDrop.handleDragMove}
      onDragEnd={dragDrop.handleDragEnd}
    >
      {/* オーバーレイ（モバイルのみ、ヘッダー下から表示） */}
      {isOpen && (
        <div
          className="fixed top-[73px] bottom-0 left-0 right-0 z-40 bg-black/50 md:hidden"
          onClick={close}
        />
      )}

      {/* サイドバー */}
      <div
        ref={dragDrop.containerRef}
        className={`
          file-tree-container
          fixed top-[73px] bottom-0 left-0 z-50 w-80
          flex-shrink-0 overflow-y-auto border-r border-gray-200
          bg-white p-4
          dark:border-gray-700 dark:bg-gray-800
          md:static md:top-0 md:z-0
          transition-all duration-300
          ${isOpen
            ? 'translate-x-0 md:translate-x-0 md:opacity-100 md:w-80'
            : '-translate-x-full md:translate-x-0 md:opacity-0 md:w-0 md:p-0 md:border-0'
          }
        `}
      >
        {/* リポジトリセレクト */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
            リポジトリ
          </label>
          {!repoLoading && repositories.length > 0 ? (
            <select
              value={selectedRepo?.full_name || ''}
              onChange={(e) => onRepoChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">選択してください...</option>
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              読み込み中...
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
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
                  onItemClick={(e) => handleItemClick(node.fullPath, e)}
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

        {selectedRepo && !treeLoading && localFileTree.length === 0 && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            ファイルが見つかりませんでした
          </p>
        )}
      </div>

      {/* DragOverlay をサイドバーの外に配置 */}
      <DragOverlay>
        {activeNode && <DragOverlayItem node={activeNode} />}
      </DragOverlay>
    </DndContext>
  )
}
