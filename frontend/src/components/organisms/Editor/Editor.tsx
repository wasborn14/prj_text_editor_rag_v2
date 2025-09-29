'use client'

import React, { useEffect } from 'react'
import { EditorTabs } from './EditorTabs'
import { EditorContent } from './EditorContent'
import { useEditorStore } from '@/stores/editorStore'
import { useFileContent } from '@/hooks/useFileContent'
import type { EditorTab } from '@/stores/editorStore'

interface EditorProps {
  repositoryId?: string
  className?: string
}

export const Editor = ({ repositoryId, className = '' }: EditorProps) => {
  const {
    openTabs,
    activeTabId,
    setLoading,
    updateContent
  } = useEditorStore()

  // アクティブタブを取得
  const activeTab: EditorTab | null = openTabs.find(tab => tab.id === activeTabId) || null
  const shouldFetchContent: boolean = Boolean(activeTab && repositoryId && activeTab.content === '')

  const {
    data: fileContentData,
    isLoading: isContentLoading,
    error: contentError
  } = useFileContent({
    repositoryId: repositoryId || '',
    filePath: activeTab?.path || '',
    enabled: !!shouldFetchContent
  })

  // ファイル内容が取得できたときの処理
  useEffect(() => {
    if (activeTab && fileContentData && activeTab.content === '') {
      console.log('Editor - File content loaded for:', activeTab.path)
      updateContent(activeTab.id, fileContentData.content)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id, fileContentData])

  // ローディング状態の管理
  useEffect(() => {
    if (activeTab && activeTab.isLoading !== isContentLoading) {
      setLoading(activeTab.id, isContentLoading)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id, isContentLoading])

  // エラー時のフォールバック
  useEffect(() => {
    if (activeTab && contentError && activeTab.content === '') {
      console.error('Editor - Content loading error:', contentError)
      // エラーメッセージを表示
      const errorMessage = `// ⚠️ Failed to load file content
//
// File: ${activeTab.path}
// Error: ${contentError.message || 'Unknown error occurred'}
//
// Possible solutions:
// 1. Check your internet connection
// 2. Verify GitHub access permissions
// 3. Try refreshing the page
//
// You can still edit this file, but changes cannot be saved until the connection is restored.`
      updateContent(activeTab.id, errorMessage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab?.id, activeTab?.path, contentError])


  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      <EditorTabs />
      <div className="flex-1 overflow-hidden">
        <EditorContent />
      </div>
    </div>
  )
}