import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

async function getSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// GET: GitHubトークンを取得
export async function GET() {
  const supabase = await getSupabaseClient()

  // 認証チェック（サーバー側でJWT検証）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 有効なトークンのみ取得（expires_atがNULLまたは未来）
    const { data, error } = await supabase
      .from('user_github_tokens')
      .select('github_token, expires_at')
      .eq('user_id', user.id)
      .or('expires_at.is.null,expires_at.gt.now()')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // データが見つからない、または期限切れ
        return NextResponse.json({ hasToken: false }, { status: 200 })
      }
      throw error
    }

    return NextResponse.json({
      hasToken: true,
      token: data.github_token,
      expiresAt: data.expires_at,
    })
  } catch (error) {
    console.error('Failed to fetch GitHub token:', error)
    return NextResponse.json(
      { error: 'Failed to fetch GitHub token' },
      { status: 500 }
    )
  }
}

// POST: GitHubトークンを保存
export async function POST(request: Request) {
  const supabase = await getSupabaseClient()

  // 認証チェック（サーバー側でJWT検証）
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { token, expiresAt } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // GitHub APIでトークンを検証
    const githubResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!githubResponse.ok) {
      return NextResponse.json(
        { error: 'Invalid GitHub token' },
        { status: 400 }
      )
    }

    // データベースに保存（既存の場合は更新）
    const { error } = await supabase.from('user_github_tokens').upsert(
      {
        user_id: user.id,
        github_token: token,
        expires_at: expiresAt || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'GitHub token saved successfully',
    })
  } catch (error) {
    console.error('Failed to save GitHub token:', error)
    return NextResponse.json(
      { error: 'Failed to save GitHub token' },
      { status: 500 }
    )
  }
}
