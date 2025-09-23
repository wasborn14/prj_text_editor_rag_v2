'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/AuthProvider'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { UserRepository } from '@/types'
import RepositorySelector from '@/components/organisms/RepositorySelector/RepositorySelector'
import { Button } from '@/components/atoms/Button/Button'
import { Avatar } from '@/components/atoms/Avatar/Avatar'
import LoadingScreen from '@/components/molecules/LoadingScreen/LoadingScreen'

export default function DashboardPage() {
  const { user, profile, loading } = useRequireAuth()
  const { signOut } = useAuth()
  const [selectedRepository, setSelectedRepository] = useState<UserRepository | null>(null)

  const handleRepositorySelect = (repository: UserRepository) => {
    setSelectedRepository(repository)
  }

  if (loading) {
    return <LoadingScreen />
  }

  // userが存在しない場合に表示しないよう制御
  if (!user) {
    return null
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                RAG Text Editor
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {profile && (
                <div className="flex items-center space-x-3">
                  <Avatar
                    src={profile.avatar_url || undefined}
                    alt={profile.display_name || 'User'}
                    size="sm"
                  />
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium text-gray-900">
                      {profile.display_name}
                    </div>
                    {profile.github_username && (
                      <div className="text-xs text-gray-500">
                        @{profile.github_username}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to RAG Text Editor
          </h2>
          <p className="text-gray-600">
            Select a repository to start editing with AI-powered assistance.
          </p>
        </div>

        {/* Repository Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <RepositorySelector
              onRepositorySelect={handleRepositorySelect}
              className="h-fit"
            />
          </div>

          {/* Sidebar - Repository Info */}
          <div className="space-y-6">
            {selectedRepository ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Selected Repository
                </h3>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-gray-500">
                      Repository
                    </div>
                    <div className="text-gray-900">
                      {selectedRepository.full_name}
                    </div>
                  </div>

                  {selectedRepository.description && (
                    <div>
                      <div className="text-sm font-medium text-gray-500">
                        Description
                      </div>
                      <div className="text-gray-900 text-sm">
                        {selectedRepository.description}
                      </div>
                    </div>
                  )}

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
                    variant="primary"
                    className="w-full"
                    disabled
                  >
                    Open Editor (Coming Soon)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Repository Info
                </h3>
                <div className="text-center py-8">
                  <div className="text-gray-500 text-sm">
                    Select a repository to view details
                  </div>
                </div>
              </div>
            )}

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