import { useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

/**
 * 認証済みユーザーを指定のパスにリダイレクトするフック
 * ランディングページなど、未認証ユーザー向けのページで使用
 */
export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useLayoutEffect(() => {
    if (!loading && user) {
      setIsRedirecting(true)
      router.replace(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  return {
    user,
    loading,
    isAuthenticated: !!user,
    isRedirecting: isRedirecting || (!!user && !loading)
  }
}