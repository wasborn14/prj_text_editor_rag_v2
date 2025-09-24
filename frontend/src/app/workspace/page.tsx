'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useRequireRepositorySelection } from '@/hooks/useRequireRepositorySelection'
import { useRepositoryFiles } from '@/hooks/useRepositoryFiles'
import { Header } from '@/components/organisms/Header/Header'
import LoadingScreen from '@/components/molecules/LoadingScreen/LoadingScreen'
import { FileTree, FileTreeNode } from '@/components/molecules/FileTree/FileTree'

export default function WorkspacePage() {
  const { user, profile, loading: authLoading } = useRequireAuth()
  const { selectedRepository, loading: repoLoading, isReady } = useRequireRepositorySelection()
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
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} selectedRepository={selectedRepository} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Workspace Layout: 2-column design */}
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left Half: Directory Structure */}
          <div className="bg-white rounded-lg shadow-md flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedRepository.full_name}
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-500">Connected</span>
                </div>
              </div>
              {selectedRepository.description && (
                <p className="text-sm text-gray-600 mt-1">
                  {selectedRepository.description}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-auto p-6">
              {filesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-sm text-gray-500">Loading files...</div>
                </div>
              ) : filesError ? (
                <div className="text-sm text-red-500 py-4">
                  Failed to load repository files
                </div>
              ) : repositoryFiles ? (
                <FileTree
                  nodes={repositoryFiles.contents}
                  onFileSelect={handleFileSelect}
                  className="border-none shadow-none"
                />
              ) : (
                <div className="text-sm text-gray-500 py-4">
                  No files found
                </div>
              )}
            </div>
          </div>

          {/* Right Half: Editor Placeholder */}
          <div className="bg-white rounded-lg shadow-md flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Editor
              </h3>
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-lg font-medium mb-2">Select a file to edit</p>
                <p className="text-sm">Choose a file from the directory tree to start editing</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}