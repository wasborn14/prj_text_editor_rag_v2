'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useRequireRepositorySelection } from '@/hooks/useRequireRepositorySelection'
import { useRepositoryFiles } from '@/hooks/useRepositoryFiles'
import { Header } from '@/components/organisms/Header/Header'
import LoadingScreen from '@/components/molecules/LoadingScreen/LoadingScreen'
import { Sidebar } from '@/components/organisms/Sidebar/Sidebar'
import { FileTreeNode } from '@/components/organisms/Sidebar/FileTreeItem'
import { useSidebarStore } from '@/stores/sidebarStore'

export default function WorkspacePage() {
  const { user, profile, loading: authLoading } = useRequireAuth()
  const { selectedRepository, loading: repoLoading, isReady } = useRequireRepositorySelection()
  const { isVisible } = useSidebarStore()
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

  const handleFileSelect = (node: FileTreeNode) => {
    console.log('File selected:', node.path)
    // TODO: ファイル内容の表示やエディタの開く処理
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
            selectedFilePath={undefined} // TODO: 選択されたファイルパスを管理
            onFileSelect={handleFileSelect}
            repositoryName={selectedRepository.name}
            searchEnabled={true} // 検索機能を有効化
          />
        ) : null}

        {/* エディタエリア */}
        <div className="flex-1 bg-white flex flex-col">
          {/* エディタヘッダー */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Editor
              </h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-500">
                  {selectedRepository.full_name}
                </span>
              </div>
            </div>
            {selectedRepository.description && (
              <p className="text-sm text-gray-600 mt-1">
                {selectedRepository.description}
              </p>
            )}
          </div>

          {/* エディタコンテンツ */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-4">📝</div>
              <p className="text-lg font-medium mb-2">Select a file to edit</p>
              <p className="text-sm">Choose a file from the sidebar to start editing</p>
              <div className="mt-4 text-xs text-gray-400">
                <p>Keyboard shortcuts:</p>
                <p>Ctrl+B: Toggle sidebar</p>
                <p>Ctrl+1/2/3: Switch view modes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}