import { useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'

/**
 * 認証が必要なページで使用するカスタムフック
 * 未認証の場合は指定されたパスにリダイレクト
 */
export function useRequireAuth(redirectTo: string = '/') {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useLayoutEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user
  }
}