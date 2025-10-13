/**
 * ルート設定
 * 認証要件を一元管理
 */

export const routes = {
  // 公開ルート（認証不要）
  public: {
    home: '/',
    login: '/login',
  },

  // 認証必須ルート
  protected: {
    dashboard: '/dashboard',
    settings: '/settings',
    workspace: '/workspace',
    editor: '/editor',
  },
} as const

/**
 * 認証が必要なパスかチェック
 */
export function isProtectedPath(pathname: string): boolean {
  const protectedPaths = Object.values(routes.protected)
  return protectedPaths.some((path) => pathname.startsWith(path))
}

/**
 * 認証済みユーザーがアクセスできないパスかチェック
 */
export function isAuthPath(pathname: string): boolean {
  return pathname === routes.public.login
}

/**
 * デフォルトの認証後リダイレクト先
 */
export const DEFAULT_REDIRECT_AFTER_LOGIN = routes.protected.dashboard

/**
 * デフォルトの未認証時リダイレクト先
 */
export const DEFAULT_REDIRECT_AFTER_LOGOUT = routes.public.login
