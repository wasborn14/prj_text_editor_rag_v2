import { useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/AuthProvider'

/**
 * 認証済みユーザーを指定のパスにリダイレクトするフック
 * ランディングページなど、未認証ユーザー向けのページで使用
 */
export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const { user, loading } = useAuth()
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