'use client'

import { useAuthStore } from '@/stores/authStore'
import { useRedirectIfAuthenticated } from '@/hooks/useRedirectIfAuthenticated'
import { Github } from 'lucide-react'

export default function LoginPage() {
  const { loading, isRedirecting } = useRedirectIfAuthenticated('/dashboard')
  const { signInWithGitHub } = useAuthStore()

  const handleGitHubLogin = async () => {
    try {
      await signInWithGitHub()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  if (loading || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-lg sm:p-8 dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">
            Text Editor RAG
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            GitHubアカウントでログイン
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleGitHubLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:text-base dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            <Github className="h-5 w-5" />
            GitHubでログイン
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-500">
          <p>
            ログインすることで、
            <br />
            利用規約とプライバシーポリシーに同意したものとみなされます
          </p>
        </div>
      </div>
    </div>
  )
}
