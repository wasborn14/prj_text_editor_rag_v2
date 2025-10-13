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

  // 認証チェック
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // user_github_tokensテーブルからトークンを取得
    const { data, error } = await supabase
      .from('user_github_tokens')
      .select('github_token, expires_at, created_at, updated_at')
      .eq('user_id', session.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // データが見つからない場合
        return NextResponse.json({ hasToken: false }, { status: 200 })
      }
      console.error('Database error:', error)
      throw error
    }

    return NextResponse.json({
      hasToken: true,
      token: data.github_token,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
  } catch (error) {
    console.error('Failed to fetch GitHub token:', error)
    return NextResponse.json(
      { error: 'Failed to fetch token' },
      { status: 500 }
    )
  }
}

// POST: GitHubトークンを保存
export async function POST(request: Request) {
  const supabase = await getSupabaseClient()

  // 認証チェック
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { token, expiresAt } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required and must be a string' },
        { status: 400 }
      )
    }

    console.log('Saving token for user:', session.user.id)
    console.log('Expires at:', expiresAt)

    // トークンを保存（既存の場合は更新）
    const { error } = await supabase
      .from('user_github_tokens')
      .upsert(
        {
          user_id: session.user.id,
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

    console.log('Token saved successfully')
    return NextResponse.json({
      success: true,
      message: 'Token saved successfully',
    })
  } catch (error) {
    console.error('Failed to save GitHub token:', error)
    return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
  }
}

// DELETE: GitHubトークンを削除
export async function DELETE() {
  const supabase = await getSupabaseClient()

  // 認証チェック
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { error } = await supabase
      .from('user_github_tokens')
      .delete()
      .eq('user_id', session.user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Token deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete GitHub token:', error)
    return NextResponse.json(
      { error: 'Failed to delete token' },
      { status: 500 }
    )
  }
}
