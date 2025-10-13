'use client'

import React, { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useRepositories } from '@/hooks/useRepositories'
import { useFileTree } from '@/hooks/useFileTree'
import { GitHubTokenModal } from '@/components/features/settings'
import {
  DashboardHeader,
  FileTreePanel,
  RepositoryContentArea,
} from '@/components/layout'
import { Repository } from '@/lib/github'
import { AlertCircle } from 'lucide-react'

export default function DashboardPage() {
  const { loading, isAuthenticated } = useRequireAuth('/login')
  const { user, githubToken, signOut, needsTokenSetup, tokenSetupReason } =
    useAuthStore()

  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())

  // TanStack Queryを使用してデータ取得
  const {
    data: repositories = [],
    isLoading: repoLoading,
    error: repoError,
  } = useRepositories(githubToken)

  const {
    data: fileTree = [],
    isLoading: treeLoading,
    error: treeError,
  } = useFileTree(githubToken, selectedRepo)

  const error = repoError?.message || treeError?.message || null

  const handleSignOut = async () => {
    await signOut()
  }

  const handleRepoChange = (repoFullName: string) => {
    const repo = repositories.find((r) => r.full_name === repoFullName)
    setSelectedRepo(repo || null)
    setExpandedDirs(new Set())
  }

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedDirs(newExpanded)
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {/* GitHubトークン設定モーダル */}
      <GitHubTokenModal isOpen={needsTokenSetup} reason={tokenSetupReason} />

      <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <DashboardHeader
          user={user}
          repositories={repositories}
          selectedRepo={selectedRepo}
          repoLoading={repoLoading}
          onRepoChange={handleRepoChange}
          onSignOut={handleSignOut}
        />

        {/* Error Alert */}
        {error && (
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    エラーが発生しました
                  </h3>
                  <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex flex-1 overflow-hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 py-6 sm:px-6 lg:px-8">
            {/* File Tree Panel */}
            <FileTreePanel
              selectedRepo={selectedRepo}
              fileTree={fileTree}
              treeLoading={treeLoading}
              expandedDirs={expandedDirs}
              error={error}
              onToggleDirectory={toggleDirectory}
            />

            {/* Content Area */}
            <RepositoryContentArea
              selectedRepo={selectedRepo}
              fileCount={fileTree.length}
            />
          </div>
        </main>
      </div>
    </>
  )
}
