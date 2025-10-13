/**
 * useRequireAuth - 認証を必須とするフック
 *
 * 役割:
 * - 保護されたページ（ダッシュボード、設定等）で使用
 * - 未認証ユーザーをログインページにリダイレクト
 * - クライアント側でリアルタイムに認証状態を監視
 *
 * ユースケース:
 * 1. ダッシュボードでログアウトボタンをクリック
 *    → authStore.signOut() → user = null → このフックが検知 → /loginにリダイレクト
 *    （Middlewareを待たずに即座に反応）
 *
 * 2. 別タブでログアウトした場合
 *    → authStoreがSupabaseのonAuthStateChangeで同期
 *    → このフックが反応してリダイレクト
 *    （リアルタイムな状態同期）
 *
 * 3. 初回ロード時のちらつき防止
 *    → loading状態を管理してローディング表示
 *    （UX向上）
 *
 * Middlewareとの違い:
 * - Middleware: サーバー側で事前チェック（リクエスト時）
 * - このHook: クライアント側でリアルタイムチェック（ログアウトなどの状態変化に即座に反応）
 *
 * useLayoutEffectを使用する理由:
 * - useEffectより早く実行され、保護されたコンテンツのちらつきを最小限に抑える
 *
 * @param redirectTo - リダイレクト先のパス（デフォルト: /login）
 */
import { useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export function useRequireAuth(redirectTo: string = '/login') {
  const user = useAuthStore((state) => state.user)
  const loading = useAuthStore((state) => state.loading)
  const router = useRouter()

  useLayoutEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo)
    }
  }, [user, loading, router, redirectTo])

  return {
    user,
    loading,
    isAuthenticated: !!user,
  }
}
