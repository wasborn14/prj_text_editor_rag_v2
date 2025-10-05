import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * 認証不要パス（Allow List方式）
 * ここに記載されていないパスは全て認証必須になります
 */
const publicPaths = [
  '/',          // ホーム（ランディングページ）
  '/login',     // ログインページ
  '/signup',    // サインアップページ
  '/about',     // 会社概要（誰でもアクセス可能）
  '/contact',   // お問い合わせ（誰でもアクセス可能）
  '/privacy',   // プライバシーポリシー（誰でもアクセス可能）
  '/terms',     // 利用規約（誰でもアクセス可能）
]

/**
 * パターンマッチング用の認証不要パス
 */
const publicPathPatterns = [
  /^\/docs\/.*/,     // ドキュメント
  /^\/api-docs\/.*/, // API仕様書
]

/**
 * 未認証ユーザー専用パス（認証済みならダッシュボードにリダイレクト）
 * publicPathsのサブセット
 */
const unauthenticatedOnlyPaths = [
  '/',        // ランディングページ
  '/login',   // ログインページ
  '/signup',  // サインアップページ
]

export async function middleware(request: NextRequest) {
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
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: Record<string, unknown>) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // セッション取得（自動リフレッシュ付き）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // パブリックパスかチェック（完全一致 + パターンマッチ）
  const isPublicPath = publicPaths.includes(path) ||
                      publicPathPatterns.some(pattern => pattern.test(path))

  // 認証が必要なパス（パブリックパス以外）
  if (!isPublicPath) {
    if (!user) {
      // 未認証の場合はホームページへリダイレクト
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 認証済みユーザーが未認証専用ページへアクセスした場合
  if (unauthenticatedOnlyPaths.includes(path)) {
    if (user) {
      // 既に認証済みの場合はダッシュボードへリダイレクト
      return NextResponse.redirect(new URL('/workspace', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}