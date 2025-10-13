/**
 * useRedirectIfAuthenticated - 認証済みユーザーをリダイレクトするフック
 *
 * 役割:
 * - ログインページや公開ページで使用
 * - 認証済みユーザーが不要にログインページを見ることを防ぐ
 * - クライアント側でリアルタイムに認証状態を監視
 *
 * ユースケース:
 * 1. ログインページで認証済みユーザーを検知 → /dashboardにリダイレクト
 * 2. 別タブでログインした場合、authStoreがリアルタイムに同期してリダイレクト
 * 3. 初回ロード時のちらつき防止（loading状態の管理）
 *
 * Middlewareとの違い:
 * - Middleware: サーバー側で事前チェック（ページにアクセスする前）
 * - このHook: クライアント側でリアルタイムチェック（ページ内での状態変化に即座に反応）
 *
 * useLayoutEffectを使用する理由:
 * - useEffectより早く実行され、画面のちらつきを最小限に抑える
 *
 * @param redirectTo - リダイレクト先のパス（デフォルト: /dashboard）
 */
import { useLayoutEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

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
    isRedirecting: isRedirecting || (!!user && !loading),
  }
}
