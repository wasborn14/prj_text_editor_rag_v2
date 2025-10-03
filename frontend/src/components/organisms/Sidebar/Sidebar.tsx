'use client'

import React, { useEffect, useState } from 'react'
import { SidebarHeader } from './SidebarHeader'
import { SidebarContent } from './SidebarContent'
import { ResizeHandle } from './ResizeHandle'
import { useSidebarStore, useSidebarKeyboard } from '@/stores/sidebarStore'
import { FileTreeNode } from './FileTreeItem'

interface SidebarProps {
  files: FileTreeNode[]
  selectedFilePath?: string
  onFileSelect: (file: FileTreeNode) => void
  repositoryName?: string
  className?: string
}

export function Sidebar({
  files,
  selectedFilePath,
  onFileSelect,
  repositoryName,
  className = ''
}: SidebarProps) {
  const { isVisible, width } = useSidebarStore()
  const { handleKeyboard } = useSidebarKeyboard()
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

  const handleSettingsClick = () => {
    // 設定モーダルを開く（将来実装）
    console.log('Open sidebar settings')
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
          repositoryName={repositoryName}
          onSearch={handleSearch}
          onSettingsClick={handleSettingsClick}
        />

        {/* コンテンツエリア */}
        <SidebarContent
          files={files}
          selectedFilePath={selectedFilePath}
          onFileSelect={onFileSelect}
          searchQuery={searchQuery}
        />
      </div>

      {/* リサイズハンドル */}
      <ResizeHandle />
    </div>
  )
}

