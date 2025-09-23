'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { UserRepository, GitHubRepository } from '@/types'
import { Button } from '@/components/atoms/Button/Button'
import LoadingSpinner from '@/components/atoms/LoadingSpinner/LoadingSpinner'

interface RepositorySelectorProps {
  onRepositorySelect?: (repository: UserRepository) => void
  className?: string
}

export default function RepositorySelector({
  onRepositorySelect,
  className = ''
}: RepositorySelectorProps) {
  const { user, githubToken } = useAuth()
  const [userRepos, setUserRepos] = useState<UserRepository[]>([])
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<UserRepository | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [showGitHubRepos, setShowGitHubRepos] = useState(false)

  // ユーザーのリポジトリ一覧を取得
  const fetchUserRepositories = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await fetch('/api/repositories')
      if (response.ok) {
        const result = await response.json()
        setUserRepos(result.data || [])

        // 選択中のリポジトリがあれば設定
        const selected = result.data?.find((repo: UserRepository) => repo.is_selected)
        if (selected) {
          setSelectedRepo(selected)
          onRepositorySelect?.(selected)
        }
      } else {
        console.error('Failed to fetch user repositories')
      }
    } catch (error) {
      console.error('Error fetching user repositories:', error)
    } finally {
      setLoading(false)
    }
  }

  // GitHubからリポジトリ一覧を取得
  const fetchGitHubRepositories = async () => {
    if (!githubToken) return

    try {
      setLoading(true)
      const response = await fetch('/api/github/repositories?sort=updated&per_page=50')
      if (response.ok) {
        const result = await response.json()
        setGithubRepos(result.data || [])
        setShowGitHubRepos(true)
      } else {
        console.error('Failed to fetch GitHub repositories')
      }
    } catch (error) {
      console.error('Error fetching GitHub repositories:', error)
    } finally {
      setLoading(false)
    }
  }

  // リポジトリを選択
  const selectRepository = async (repository: UserRepository) => {
    try {
      setLoading(true)
      const response = await fetch('/api/repositories/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository_id: repository.id
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSelectedRepo(result.data.selected)
        onRepositorySelect?.(result.data.selected)

        // リスト更新
        await fetchUserRepositories()
      } else {
        console.error('Failed to select repository')
      }
    } catch (error) {
      console.error('Error selecting repository:', error)
    } finally {
      setLoading(false)
    }
  }

  // GitHubリポジトリを登録
  const addGitHubRepository = async (githubRepo: GitHubRepository) => {
    try {
      setSyncing(true)
      const response = await fetch('/api/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_repo_id: githubRepo.id,
          owner: githubRepo.owner,
          name: githubRepo.name,
          full_name: githubRepo.fullName,
          description: githubRepo.description,
          default_branch: githubRepo.defaultBranch,
          language: githubRepo.language,
        }),
      })

      if (response.ok) {
        // リスト更新
        await fetchUserRepositories()
      } else {
        console.error('Failed to add GitHub repository')
      }
    } catch (error) {
      console.error('Error adding GitHub repository:', error)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchUserRepositories()
    }
  }, [user])

  if (loading && userRepos.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Repository Selection
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={fetchGitHubRepositories}
              disabled={loading || !githubToken}
            >
              {loading ? 'Loading...' : 'Browse GitHub'}
            </Button>
            <Button
              variant="outline"
              onClick={fetchUserRepositories}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 選択中のリポジトリ */}
        {selectedRepo && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Currently Selected
            </h3>
            <div className="text-blue-800">
              <div className="font-medium">{selectedRepo.full_name}</div>
              {selectedRepo.description && (
                <div className="text-sm text-blue-600 mt-1">
                  {selectedRepo.description}
                </div>
              )}
              <div className="text-xs text-blue-500 mt-1">
                Last accessed: {new Date(selectedRepo.last_accessed_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {/* ユーザーのリポジトリ一覧 */}
        {userRepos.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Your Repositories ({userRepos.length})
            </h3>
            <div className="space-y-2">
              {userRepos.map((repo) => (
                <div
                  key={repo.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    repo.is_selected
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => !repo.is_selected && selectRepository(repo)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {repo.full_name}
                        {repo.is_selected && (
                          <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                      {repo.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {repo.description}
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                        {repo.language && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {repo.language}
                          </span>
                        )}
                        <span>Branch: {repo.default_branch}</span>
                        <span>
                          Updated: {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GitHub リポジトリ一覧 */}
        {showGitHubRepos && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add from GitHub ({githubRepos.length})
            </h3>
            <div className="space-y-2">
              {githubRepos
                .filter(githubRepo =>
                  !userRepos.some(userRepo =>
                    userRepo.github_repo_id === githubRepo.id
                  )
                )
                .map((repo) => (
                <div
                  key={repo.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {repo.fullName}
                      </div>
                      {repo.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {repo.description}
                        </div>
                      )}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                        {repo.language && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            {repo.language}
                          </span>
                        )}
                        <span>Branch: {repo.defaultBranch}</span>
                        <span>
                          Updated: {new Date(repo.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => addGitHubRepository(repo)}
                      disabled={syncing}
                    >
                      {syncing ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {userRepos.length === 0 && !showGitHubRepos && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              No repositories found. Add repositories from GitHub to get started.
            </div>
            <Button
              variant="primary"
              onClick={fetchGitHubRepositories}
              disabled={loading || !githubToken}
            >
              Browse GitHub Repositories
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}