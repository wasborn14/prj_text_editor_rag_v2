'use client'

import { useAuthStore } from '@/stores/authStore'
import { Github } from 'lucide-react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const { signInWithGitHub, user, loading } = useAuthStore()

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleSignIn = async () => {
    try {
      await signInWithGitHub()
    } catch (error) {
      console.error('Sign in failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-10 shadow-xl dark:bg-gray-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            RAG Editor
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            GitHub連携でリポジトリを編集
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:focus:ring-white"
          >
            <Github className="h-5 w-5" />
            GitHubでログイン
          </button>

          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            ログインすることで、GitHubリポジトリへのアクセスを許可します
          </p>
        </div>
      </div>
    </div>
  )
}
