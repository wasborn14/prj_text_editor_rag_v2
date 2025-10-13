import React from 'react'
import { LogOut } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Repository } from '@/lib/github'

interface DashboardHeaderProps {
  user: SupabaseUser | null
  repositories: Repository[]
  selectedRepo: Repository | null
  repoLoading: boolean
  onRepoChange: (repoFullName: string) => void
  onSignOut: () => void
}

function getUserDisplayName(user: SupabaseUser | null): string {
  if (!user) return ''
  return user.user_metadata?.user_name || user.email || ''
}

export function DashboardHeader({
  user,
  repositories,
  selectedRepo,
  repoLoading,
  onRepoChange,
  onSignOut,
}: DashboardHeaderProps) {
  return (
    <header className="flex-shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getUserDisplayName(user)}
              </p>
            </div>

            {/* Repository Selector */}
            {!repoLoading && repositories.length > 0 && (
              <div className="ml-8">
                <select
                  value={selectedRepo?.full_name || ''}
                  onChange={(e) => onRepoChange(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">リポジトリを選択...</option>
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      </div>
    </header>
  )
}
