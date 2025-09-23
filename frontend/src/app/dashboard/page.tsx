'use client'

import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useRequireRepositorySelection } from '@/hooks/useRequireRepositorySelection'
import { UserRepository } from '@/types'
import RepositorySelector from '@/components/organisms/RepositorySelector/RepositorySelector'
import { Button } from '@/components/atoms/Button/Button'
import { Header } from '@/components/organisms/Header/Header'
import LoadingScreen from '@/components/molecules/LoadingScreen/LoadingScreen'

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useRequireAuth()
  const { selectedRepository, loading: repoLoading, isReady } = useRequireRepositorySelection()
  const loading = authLoading || repoLoading

  const handleRepositoryAdd = (repository: UserRepository) => {
    console.log('Repository added:', repository)
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
      <Header profile={profile} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back to RAG Text Editor
          </h2>
          <p className="text-gray-600">
            Continue working on <span className="font-medium">{selectedRepository.full_name}</span> with AI-powered assistance.
          </p>
        </div>

        {/* Current Repository Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Main Repository Card */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedRepository.full_name}
                    </h3>
                  </div>
                  {selectedRepository.description && (
                    <p className="text-gray-600 mb-4">
                      {selectedRepository.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    {selectedRepository.language && (
                      <span className="px-2 py-1 bg-gray-100 rounded">
                        {selectedRepository.language}
                      </span>
                    )}
                    <span>{selectedRepository.default_branch}</span>
                    <span>
                      Last accessed: {new Date(selectedRepository.last_accessed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="primary">
                    Open Editor
                  </Button>
                  <Button variant="outline">
                    Settings
                  </Button>
                </div>
              </div>
            </div>

            {/* Additional Repository Management */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Additional Repositories
                </h3>
                <Button variant="outline" size="sm">
                  Browse GitHub
                </Button>
              </div>
              <RepositorySelector
                onRepositorySelect={handleRepositoryAdd}
                className="h-fit"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Current Repository Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Repository Details
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Full Name
                  </div>
                  <div className="text-gray-900">
                    {selectedRepository.full_name}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Default Branch
                  </div>
                  <div className="text-gray-900">
                    {selectedRepository.default_branch}
                  </div>
                </div>

                {selectedRepository.language && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      Primary Language
                    </div>
                    <div className="text-gray-900">
                      {selectedRepository.language}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium text-gray-500">
                    Last Accessed
                  </div>
                  <div className="text-gray-900 text-sm">
                    {new Date(selectedRepository.last_accessed_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`https://github.com/${selectedRepository.full_name}`, '_blank')}
                >
                  View on GitHub
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                >
                  <span className="text-left">
                    📝 Create New Document
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                >
                  <span className="text-left">
                    🔍 Search Repository
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled
                >
                  <span className="text-left">
                    📊 View Analytics
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}