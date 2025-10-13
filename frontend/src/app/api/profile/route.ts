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

// POST: プロフィールを保存
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
    const { github_username, github_id, display_name, avatar_url } = body

    console.log('Saving profile for user:', session.user.id)
    console.log('GitHub username:', github_username)

    // プロフィールを保存（既存の場合は更新）
    const { error } = await supabase.from('profiles').upsert(
      {
        id: session.user.id,
        github_username,
        github_id,
        display_name,
        avatar_url,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'id',
      }
    )

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Profile saved successfully')
    return NextResponse.json({
      success: true,
      message: 'Profile saved successfully',
    })
  } catch (error) {
    console.error('Failed to save profile:', error)
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    )
  }
}

// GET: プロフィールを取得
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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // データが見つからない場合
        return NextResponse.json({ hasProfile: false }, { status: 200 })
      }
      throw error
    }

    return NextResponse.json({
      hasProfile: true,
      profile: data,
    })
  } catch (error) {
    console.error('Failed to fetch profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
