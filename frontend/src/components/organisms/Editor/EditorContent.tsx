'use client'

import React from 'react'
import '@/styles/novel.css'
import { useEditorStore } from '@/stores/editorStore'
import { NovelWithMenu } from './NovelWithMenu'
import { parseToProseMirror, convertNovelChange } from '@/utils/prosemirror'
import { sampleContent } from '@/data/sampleContent'

interface EditorContentProps {
  className?: string
}

export const EditorContent = ({ className = '' }: EditorContentProps) => {
  const {
    openTabs,
    activeTabId,
    updateContent
  } = useEditorStore()

  const activeTab = openTabs.find(tab => tab.id === activeTabId) || null

  // サンプル表示の切り替えフラグ
  const isSample = false  // true にするとサンプル内容を表示

  const handleNovelChange = (content: unknown) => {
    if (activeTab) {
      const textContent = convertNovelChange(content)
      updateContent(activeTab.id, textContent)
    }
  }


  // アクティブタブがない場合のウェルカム画面
  if (!activeTab) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-medium mb-2">Welcome to Editor</h3>
          <p className="text-sm mb-4">Select a file from the sidebar to start editing</p>
          <div className="text-xs text-gray-400 space-y-1">
            <p>Keyboard shortcuts:</p>
            <p>Ctrl+P: Quick file search</p>
            <p>Ctrl+S: Save file</p>
            <p>Ctrl+W: Close tab</p>
            <p>Ctrl+F: Find in file</p>
          </div>
        </div>
      </div>
    )
  }

  // ローディング中
  if (activeTab.isLoading) {
    return (
      <div className={`flex-1 flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mb-4" />
          <p className="text-sm text-gray-600">Loading {activeTab.name}...</p>
        </div>
      </div>
    )
  }

  // エディタ表示
  return (
    <div className={`w-full h-full overflow-auto ${className}`}>
      <NovelWithMenu
        content={isSample ? parseToProseMirror(sampleContent) : parseToProseMirror(activeTab?.content || '')}
        onChange={handleNovelChange}
      />
    </div>
  )
}