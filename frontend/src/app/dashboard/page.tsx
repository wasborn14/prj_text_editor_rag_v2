'use client'

import { useAuthStore } from '@/stores/authStore'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { LogOut, User } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

function getUserDisplayName(user: SupabaseUser | null): string {
  if (!user) return ''
  return user.user_metadata?.user_name || user.email || ''
}

export default function DashboardPage() {
  const { loading, isAuthenticated } = useRequireAuth('/login')
  const { user, signOut } = useAuthStore()

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl dark:text-white">
                Dashboard
              </h1>
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-2 py-1 sm:px-3 sm:py-1.5 dark:bg-gray-700">
                <User className="h-3 w-3 text-gray-600 sm:h-4 sm:w-4 dark:text-gray-400" />
                <span className="truncate text-xs text-gray-900 sm:text-sm dark:text-white">
                  {getUserDisplayName(user)}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">
                Welcome to Dashboard
              </h2>
              <p className="mt-2 text-sm text-gray-600 sm:text-base dark:text-gray-400">
                ログイン成功！ダッシュボード機能を実装していきます。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
