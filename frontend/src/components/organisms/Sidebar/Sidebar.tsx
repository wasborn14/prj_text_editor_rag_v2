'use client'

import React, { useEffect, useState } from 'react'
import { SidebarHeader } from './SidebarHeader'
import { SidebarContent } from './SidebarContent'
import { ResizeHandle } from './ResizeHandle'
import { useSidebarStore, useSidebarKeyboard } from '@/stores/sidebarStore'
import { FileTreeNode } from './FileTreeItem'
import { useCreateFile } from '@/hooks/useCreateFile'
import { useEditorStore } from '@/stores/editorStore'
import { UserRepository } from '@/types'

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
  const { isVisible, width } = useSidebarStore()
  const { handleKeyboard } = useSidebarKeyboard()
  const { createFile } = useCreateFile()
  const { openFile } = useEditorStore()
  const [searchQuery, setSearchQuery] = useState('')

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
        content: type === 'file' ? '# New File\n\nStart editing...' : '',
        type
      })

      if (result?.success) {
        console.log(`Successfully created ${type}: ${fullPath}`)

        // ファイル一覧を更新
        if (onRefresh) {
          onRefresh()
        }

        // 作成したファイルをエディタで開く（ファイルの場合のみ）
        if (type === 'file') {
          openFile({
            path: fullPath,
            name,
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

  if (!isVisible) {
    return null
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
          selectedFileType={files.find(f => f.path === selectedFilePath)?.type}
        />

        {/* コンテンツエリア */}
        <SidebarContent
          files={files}
          selectedFilePath={selectedFilePath}
          onFileSelect={onFileSelect}
          searchQuery={searchQuery}
          onCreateConfirm={handleCreateConfirm}
        />
      </div>

      {/* リサイズハンドル */}
      <ResizeHandle />
    </div>
  )
}

