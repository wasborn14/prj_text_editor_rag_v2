import { useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

/**
 * 認証が必要なページで使用するカスタムフック
 * 未認証の場合は指定されたパスにリダイレクト
 */
export function useRequireAuth(redirectTo: string = '/') {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)
  const loading = useAuthStore((state) => state.loading)
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