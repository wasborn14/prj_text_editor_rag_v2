'use client'

import { useState } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useGitHubRepositories } from '@/hooks/useGitHubRepositories'
import { useCreateAndSelectRepository } from '@/hooks/useRepositoryMutations'
import { GitHubRepository } from '@/types'
import { Button } from '@/components/atoms/Button/Button'
import LoadingSpinner from '@/components/atoms/LoadingSpinner/LoadingSpinner'
import LoadingScreen from '@/components/molecules/LoadingScreen/LoadingScreen'
import RepositoryItem from '@/components/molecules/RepositoryItem/RepositoryItem'
import { Header } from '@/components/organisms/Header/Header'

export default function RepositorySetupPage() {
  const { user, profile, loading } = useRequireAuth()

  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null)

  const {
    data: repositories = [],
    isLoading: repositoriesLoading,
    error,
  } = useGitHubRepositories({
    sort: 'updated',
    perPage: 50,
  })

  const createAndSelectMutation = useCreateAndSelectRepository()

  const handleSelect = () => {
    if (!selectedRepo) return
    createAndSelectMutation.mutate(selectedRepo)
  }

  // ローディング中または未認証の場合（useRequireAuthがリダイレクトを処理）
  if (loading || !user) {
    return <LoadingScreen withGradient />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {/* ページヘッダー */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Choose Your GitHub Repository
            </h2>
            <p className="text-gray-600">
              Select a repository from your GitHub account to work with. You can add more repositories or change this later.
            </p>
          </div>

          {/* リポジトリリスト */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            {repositoriesLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
                <span className="ml-3 text-gray-600">Loading repositories...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                  {error instanceof Error ? error.message : 'Failed to load repositories'}
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : repositories.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-600 mb-6">
                  No repositories found in your GitHub account.
                </div>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    It looks like you don&apos;t have any repositories in your GitHub account yet.
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Create a repository on GitHub first, then come back here to set it up.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  Your GitHub Repositories ({repositories.length})
                </h2>

                {repositories.map((repo) => (
                  <RepositoryItem
                    key={repo.id}
                    repository={repo}
                    isSelected={selectedRepo?.id === repo.id}
                    onSelect={setSelectedRepo}
                  />
                ))}

                <div className="pt-6 border-t border-gray-200">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleSelect}
                    disabled={!selectedRepo || createAndSelectMutation.isPending}
                  >
                    {createAndSelectMutation.isPending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Setting up...</span>
                      </>
                    ) : (
                      'Continue to Workspace'
                    )}
                  </Button>

                  {selectedRepo && (
                    <div className="text-sm text-gray-500 text-center mt-3">
                      Selected: {selectedRepo.fullName}
                    </div>
                  )}

                  {createAndSelectMutation.isError && (
                    <div className="text-sm text-red-600 text-center mt-3">
                      {createAndSelectMutation.error?.message || 'Failed to setup repository'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* フッター */}
          <div className="text-center mt-8 text-sm text-gray-500">
            Can&apos;t find your repository? Make sure it&apos;s accessible on your GitHub account.
          </div>
        </div>
      </main>
    </div>
  )
}