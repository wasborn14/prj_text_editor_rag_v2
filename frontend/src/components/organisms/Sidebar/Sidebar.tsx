'use client'

import React, { useEffect, useState } from 'react'
import { SidebarHeader } from './SidebarHeader'
import { SidebarContent } from './SidebarContent'
import { ResizeHandle } from './ResizeHandle'
import { useSidebarStore, useSidebarKeyboard } from '@/stores/sidebarStore'
import { FileTreeNode } from './FileTreeItem'
import { useCreateFile } from '@/hooks/useCreateFile'
import { useDeleteFile } from '@/hooks/useDeleteFile'
import { useRenameFile } from '@/hooks/useRenameFile'
import { useEditorStore } from '@/stores/editorStore'
import { UserRepository } from '@/types'
import { ContextMenu, ContextMenuItem } from '@/components/molecules/ContextMenu/ContextMenu'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog/ConfirmDialog'
import { Trash2, FilePlus, FolderPlus, Edit2 } from 'lucide-react'

interface SidebarProps {
  files: FileTreeNode[]
  selectedFilePath?: string
  onFileSelect: (file: FileTreeNode) => void
  repository?: UserRepository
  onRefresh?: () => void
  className?: string
}

export function Sidebar({
  files,
  selectedFilePath,
  onFileSelect,
  repository,
  onRefresh,
  className = ''
}: SidebarProps) {
  const { isVisible, width, contextMenu, closeContextMenu, setCreatingItem, setRenamingItem } = useSidebarStore()
  const { handleKeyboard } = useSidebarKeyboard()
  const { createFile } = useCreateFile()
  const { deleteFile, isDeleting } = useDeleteFile()
  const { renameFile, isRenaming } = useRenameFile()
  const { openFile, closeTab, openTabs, updateTabPath } = useEditorStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    path: string
    type: 'file' | 'dir'
  }>({ isOpen: false, path: '', type: 'file' })

  // キーボードショートカットの設定
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboard)
    return () => document.removeEventListener('keydown', handleKeyboard)
  }, [handleKeyboard])

  // レスポンシブ対応
  useEffect(() => {
    const handleResize = () => {
      const { setVisibility } = useSidebarStore.getState()

      // モバイルサイズ以下では自動で非表示
      if (window.innerWidth < 768) {
        setVisibility(false)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // 初期チェック

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleCreateConfirm = async (name: string, type: 'file' | 'folder') => {
    if (!repository) {
      console.error('No repository selected')
      return
    }

    const { cancelCreating, creatingItem } = useSidebarStore.getState()
    const parentPath = creatingItem?.parentPath || ''
    const fullPath = parentPath ? `${parentPath}/${name}` : name

    try {
      const result = await createFile({
        owner: repository.owner,
        repo: repository.name,
        path: fullPath,
        content: type === 'file' ? undefined : '', // undefinedでAPI側のデフォルト（パスベース）を使用
        type
      })

      if (result?.success) {

        // ファイル一覧を更新
        if (onRefresh) {
          onRefresh()
        }

        // 作成したファイルをエディタで開く（ファイルの場合のみ）
        if (type === 'file') {
          openFile({
            path: fullPath,
            name: name,  // CreateFileInputから渡される名前（.md付き）
            type: 'file'
          })
        }

        cancelCreating()
      }
    } catch (error) {
      console.error(`Failed to create ${type}:`, error)
      // TODO: エラーをユーザーに表示（トースト通知など）
    }
  }

  const handleNewFileClick = (parentPath: string) => {
    setCreatingItem({ type: 'file', parentPath })
    closeContextMenu()
  }

  const handleNewFolderClick = (parentPath: string) => {
    setCreatingItem({ type: 'folder', parentPath })
    closeContextMenu()
  }

  const handleRenameClick = (path: string, type: 'file' | 'dir') => {
    setRenamingItem({ path, type })
    closeContextMenu()
  }

  const handleRenameConfirm = async (newName: string) => {
    if (!repository) return

    const { renamingItem } = useSidebarStore.getState()
    if (!renamingItem) return

    const { path: oldPath, type } = renamingItem
    const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'))
    const newPath = parentPath ? `${parentPath}/${newName}` : newName

    try {
      const result = await renameFile({
        owner: repository.owner,
        repo: repository.name,
        oldPath,
        newPath,
        type
      })

      if (result?.success) {
        console.log(`Successfully renamed ${type}: ${oldPath} → ${newPath}`)

        // エディタのタブを更新
        if (type === 'file') {
          updateTabPath(oldPath, newPath, newName)
        } else {
          // フォルダの場合、配下の全ファイルのタブパスを更新
          openTabs.forEach(tab => {
            if (tab.path.startsWith(oldPath + '/')) {
              const relativePath = tab.path.substring(oldPath.length)
              const newTabPath = newPath + relativePath
              const newTabName = tab.name
              updateTabPath(tab.path, newTabPath, newTabName)
            }
          })
        }

        // ファイル一覧を更新
        if (onRefresh) {
          onRefresh()
        }

        const { cancelRenaming } = useSidebarStore.getState()
        cancelRenaming()
      }
    } catch (error) {
      console.error(`Failed to rename ${type}:`, error)
      // TODO: エラーをユーザーに表示（トースト通知など）
    }
  }

  const handleDeleteClick = (path: string, type: 'file' | 'dir') => {
    setConfirmDialog({ isOpen: true, path, type })
    closeContextMenu()
  }

  const handleDeleteConfirm = async () => {
    if (!repository) return

    const { path, type } = confirmDialog

    try {
      const result = await deleteFile({
        owner: repository.owner,
        repo: repository.name,
        path,
        type
      })

      if (result?.success) {
        console.log(`Successfully deleted ${type}: ${path}`)

        // 削除されたファイルがエディタで開いている場合、タブを閉じる
        if (type === 'file') {
          const openTab = openTabs.find(tab => tab.path === path)
          if (openTab) {
            closeTab(openTab.id)
          }
        } else {
          // フォルダの場合、配下の全ファイルのタブを閉じる
          openTabs.forEach(tab => {
            if (tab.path.startsWith(path + '/')) {
              closeTab(tab.id)
            }
          })
        }

        // ファイル一覧を更新
        if (onRefresh) {
          onRefresh()
        }

        setConfirmDialog({ isOpen: false, path: '', type: 'file' })
      }
    } catch (error) {
      console.error(`Failed to delete ${type}:`, error)
      // TODO: エラーをユーザーに表示（トースト通知など）
    }
  }

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        {
          label: 'New File',
          icon: <FilePlus className="w-4 h-4" />,
          onClick: () => handleNewFileClick(contextMenu.targetType === 'dir' ? contextMenu.targetPath : contextMenu.targetPath.substring(0, contextMenu.targetPath.lastIndexOf('/'))),
        },
        {
          label: 'New Folder',
          icon: <FolderPlus className="w-4 h-4" />,
          onClick: () => handleNewFolderClick(contextMenu.targetType === 'dir' ? contextMenu.targetPath : contextMenu.targetPath.substring(0, contextMenu.targetPath.lastIndexOf('/'))),
        },
        {
          label: 'Rename',
          icon: <Edit2 className="w-4 h-4" />,
          onClick: () => handleRenameClick(contextMenu.targetPath, contextMenu.targetType),
        },
        {
          label: 'Delete',
          icon: <Trash2 className="w-4 h-4" />,
          onClick: () => handleDeleteClick(contextMenu.targetPath, contextMenu.targetType),
          danger: true
        }
      ]
    : []

  if (!isVisible) {
    return null
  }

  // 選択中のファイル/ディレクトリのタイプを再帰的に検索
  const findNodeType = (nodes: FileTreeNode[], path: string | undefined): 'file' | 'dir' | undefined => {
    if (!path) return undefined

    for (const node of nodes) {
      if (node.path === path) {
        return node.type
      }
      if (node.children) {
        const childType = findNodeType(node.children, path)
        if (childType) return childType
      }
    }
    return undefined
  }

  const sidebarStyle = {
    width: `${width}px`,
    minWidth: '200px',
    maxWidth: '600px'
  }

  return (
    <div
      className={`
        flex h-full bg-white border-r border-gray-200
        transition-all duration-200 ease-in-out
        ${className}
      `}
      style={sidebarStyle}
    >
      {/* サイドバーのメインコンテンツ */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* ヘッダー */}
        <SidebarHeader
          onSearch={handleSearch}
          selectedFilePath={selectedFilePath}
          selectedFileType={findNodeType(files, selectedFilePath)}
        />

        {/* コンテンツエリア */}
        <SidebarContent
          files={files}
          selectedFilePath={selectedFilePath}
          onFileSelect={onFileSelect}
          searchQuery={searchQuery}
          onCreateConfirm={handleCreateConfirm}
          onRenameConfirm={handleRenameConfirm}
        />
      </div>

      {/* リサイズハンドル */}
      <ResizeHandle />

      {/* コンテキストメニュー */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={`Delete ${confirmDialog.type === 'dir' ? 'Folder' : 'File'}`}
        message={`Are you sure you want to delete "${confirmDialog.path}"?${
          confirmDialog.type === 'dir'
            ? ' This will delete all files within this folder.'
            : ''
        }`}
        confirmText="Delete"
        cancelText="Cancel"
        danger={true}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDialog({ isOpen: false, path: '', type: 'file' })}
      />
    </div>
  )
}

