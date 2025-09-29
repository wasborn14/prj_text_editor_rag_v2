'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useRequireRepositorySelection } from '@/hooks/useRequireRepositorySelection'
import { useRepositoryFiles } from '@/hooks/useRepositoryFiles'
import { useFileContent } from '@/hooks/useFileContent'
import { Header } from '@/components/organisms/Header/Header'
import LoadingScreen from '@/components/molecules/LoadingScreen/LoadingScreen'
import { Sidebar } from '@/components/organisms/Sidebar/Sidebar'
import { FileTreeNode } from '@/components/organisms/Sidebar/FileTreeItem'
import { Editor } from '@/components/organisms/Editor/Editor'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useEditorStore } from '@/stores/editorStore'

export default function WorkspacePage() {
  const { user, profile, loading: authLoading } = useRequireAuth()
  const { selectedRepository, loading: repoLoading, isReady } = useRequireRepositorySelection()
  const { isVisible } = useSidebarStore()
  const { openFile, openTabs, activeTabId } = useEditorStore()
  const [selectedFile, setSelectedFile] = useState<FileTreeNode | null>(null)
  const loading = authLoading || repoLoading

  // リポジトリファイル構造を取得
  const {
    data: repositoryFiles,
    isLoading: filesLoading,
    error: filesError
  } = useRepositoryFiles({
    repositoryId: selectedRepository?.id || '',
    enabled: !!selectedRepository
  })

  // アクティブタブのファイル内容を取得
  const activeTab = openTabs.find(tab => tab.id === activeTabId) || null
  const shouldFetchContent = Boolean(activeTab && selectedRepository && activeTab.content === '')

  useFileContent({
    repositoryId: selectedRepository?.id || '',
    filePath: activeTab?.path || '',
    enabled: shouldFetchContent
  })

  const handleFileSelect = (node: FileTreeNode) => {
    console.log('File selected:', node.path)

    // ファイルの場合のみタブを開く
    if (node.type === 'file') {
      openFile({
        path: node.path,
        name: node.name,
        type: node.type
      })
    }

    setSelectedFile(node)
  }


  if (loading) {
    return <LoadingScreen />
  }

  // userが存在しない場合やリポジトリ選択が完了していない場合
  if (!user || !isReady || !selectedRepository) {
    return null // リダイレクト処理はフック内で実行
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header with integrated Sidebar Toggle */}
      <Header profile={profile} selectedRepository={selectedRepository} />

      {/* Main Content: Sidebar + Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* サイドバー */}
        {filesLoading ? (
          // ローディング中のサイドバー
          isVisible && (
            <div className="w-80 bg-white border-r border-gray-200 flex items-center justify-center">
              <div className="text-sm text-gray-500">Loading files...</div>
            </div>
          )
        ) : filesError ? (
          // エラー時のサイドバー
          isVisible && (
            <div className="w-80 bg-white border-r border-gray-200 flex items-center justify-center">
              <div className="text-sm text-red-500 p-4 text-center">
                Failed to load repository files
              </div>
            </div>
          )
        ) : repositoryFiles ? (
          // 正常時のサイドバー
          <Sidebar
            files={repositoryFiles.contents}
            selectedFilePath={selectedFile?.path}
            onFileSelect={handleFileSelect}
            repositoryName={selectedRepository.name}
            searchEnabled={true}
          />
        ) : null}

        {/* エディタエリア */}
        <div className="flex-1 bg-white flex flex-col">
          <Editor />
        </div>
      </div>
    </div>
  )
}