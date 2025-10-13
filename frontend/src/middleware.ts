/**
 * Middleware - サーバーサイド認証ガード
 *
 * 役割:
 * - リクエストの最初の門番として、ページにアクセスする前に認証をチェック
 * - サーバー側でJWT検証を行い、改ざん不可能な認証チェックを実現
 * - 保護されたコンテンツがHTMLに含まれないようにする（SEO・セキュリティ）
 *
 * ユースケース:
 * 1. 未認証ユーザーが保護ページ(/dashboard等)にアクセス → /loginにリダイレクト
 *    - ページコンポーネントすら実行されない（最速のブロック）
 * 2. 認証済みユーザーがログインページにアクセス → /dashboardにリダイレクト
 *    - 無駄なログインフォームの表示を防ぐ
 *
 * Hooksとの役割分担（Defense in Depth）:
 * - Middleware: サーバー側で確実にブロック（セキュリティの最前線）
 * - Hooks: クライアント側でリアルタイムに反応（UXとリアルタイム同期）
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isProtectedPath, isAuthPath } from '@/config/routes'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Supabaseクライアント作成
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ユーザー取得（サーバー側でJWT検証）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 認証が必要なパスへのアクセス
  if (isProtectedPath(pathname)) {
    if (!user) {
      // 未認証 → ログインページへリダイレクト
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 認証済みユーザーがログインページにアクセス
  if (isAuthPath(pathname)) {
    if (user) {
      // 認証済み → ダッシュボードへリダイレクト
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
