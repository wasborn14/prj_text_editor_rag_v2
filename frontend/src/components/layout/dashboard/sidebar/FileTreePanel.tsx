'use client'

import React, { useMemo, useCallback, useState } from 'react'
import '@/styles/FileTreePanel.css'
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Loader2, Edit } from 'lucide-react'
import {
  buildTreeStructure,
  flattenTree,
  isNodeInDragOverDirectory,
} from '@/lib/fileTree'
import { useFileTreeSelection, useFileTreeDragDrop } from '@/hooks/fileTree'
import { useFileTreeStore } from '@/stores/fileTreeStore'
import { useAuthStore } from '@/stores/authStore'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useEditorStore } from '@/stores/editorStore'
import { useEditorState } from '@/hooks/useEditorState'
import { useRestoreEditorState } from '@/hooks/useRestoreEditorState'
import { useThemeStore } from '@/stores/themeStore'
import { FileTreeItem } from './FileTreeItem'
import { DragOverlayItem } from './DragOverlayItem'
import { Repository } from '@/lib/github'
import { ContextMenu } from '@/components/common/ContextMenu'
import { useFileRename } from '@/hooks/useFileRename'

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
  const { setSelectedFile } = useEditorStore()
  const { isDarkMode } = useThemeStore()

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

  // エディタ状態の永続化
  const { saveLastOpenedFile, saveExpandedFolders } = useEditorState()

  // リポジトリ選択時に状態を復元
  const fileTreeLoaded = localFileTree.length > 0 && !treeLoading
  useRestoreEditorState(selectedRepo, fileTreeLoaded)

  // リネーム機能のState
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    path: string
  } | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const [isRenameProcessing, setIsRenameProcessing] = useState(false)

  // フォルダ開閉時のハンドラ（トグル + 保存）
  const handleToggleDirectory = useCallback((path: string) => {
    toggleDirectory(path)

    // トグル後の状態を計算して保存
    const isCurrentlyExpanded = expandedDirs.has(path)
    const newExpandedDirs = isCurrentlyExpanded
      ? Array.from(expandedDirs).filter(p => p !== path)
      : [...expandedDirs, path]

    saveExpandedFolders(newExpandedDirs)
  }, [toggleDirectory, expandedDirs, saveExpandedFolders])

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

  // リネーム処理のカスタムフック
  const { handleRenameConfirm } = useFileRename({
    selectedRepo,
    githubToken,
    localFileTree,
    flatTree,
    expandedDirs,
    setLocalFileTree,
    setExpandedDirs,
    setIsRenameProcessing,
    setRenamingPath,
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

  // ファイル/ディレクトリ選択時の処理
  const handleItemClick = (fullPath: string, e: React.MouseEvent) => {
    selection.handleItemClick(fullPath, e)

    // ファイルの場合、選択パスをストアに保存（TanStack Queryが自動で取得）
    const node = flatTree.find((n) => n.fullPath === fullPath)
    if (node && node.type === 'file') {
      setSelectedFile(fullPath)
      saveLastOpenedFile(fullPath) // Supabaseに保存
    }
  }

  // コンテキストメニュー表示
  const handleContextMenu = useCallback((path: string, e: React.MouseEvent) => {
    setContextMenu({ x: e.clientX, y: e.clientY, path })
  }, [])

  // リネーム開始
  const handleRenameStart = useCallback(() => {
    if (contextMenu) {
      setRenamingPath(contextMenu.path)
      setContextMenu(null)
    }
  }, [contextMenu])

  // リネーム確定のラッパー（renamingPathを渡すため）
  const handleRenameConfirmWrapper = useCallback(
    async (newName: string) => {
      if (renamingPath) {
        await handleRenameConfirm(renamingPath, newName)
      }
    },
    [renamingPath, handleRenameConfirm]
  )

  // リネームキャンセル
  const handleRenameCancel = useCallback(() => {
    setRenamingPath(null)
  }, [])

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
          p-4
          dark:border-gray-700
          md:static md:top-0 md:z-0
          transition-all duration-300
          ${isOpen
            ? 'translate-x-0 md:translate-x-0 md:opacity-100 md:w-80'
            : '-translate-x-full md:translate-x-0 md:opacity-0 md:w-0 md:p-0 md:border-0'
          }
        `}
        style={{ backgroundColor: isDarkMode ? '#202020' : 'white' }}
      >
        {/* リポジトリセレクト */}
        <div className="mb-4">
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
                  onToggle={() => handleToggleDirectory(node.fullPath)}
                  onItemClick={(e) => handleItemClick(node.fullPath, e)}
                  isDragOver={dragDrop.overId === node.fullPath}
                  isInDragOverDirectory={isNodeInDragOverDirectory(
                    node,
                    dragDrop.overId,
                    overNode
                  )}
                  isRenaming={renamingPath === node.fullPath}
                  isRenameProcessing={isRenameProcessing}
                  onContextMenu={(e) => handleContextMenu(node.fullPath, e)}
                  onRenameConfirm={handleRenameConfirmWrapper}
                  onRenameCancel={handleRenameCancel}
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

      {/* コンテキストメニュー */}
      <ContextMenu
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        isOpen={!!contextMenu}
        onClose={() => setContextMenu(null)}
        items={[
          {
            label: 'Rename',
            icon: <Edit className="h-4 w-4" />,
            onClick: handleRenameStart,
          },
        ]}
      />
    </DndContext>
  )
}
