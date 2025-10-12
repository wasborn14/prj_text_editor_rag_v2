import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { CreateProfileRequest, UpdateProfileRequest } from '@/types'

// GET /api/profile - プロフィール取得
export async function GET() {
  try {
    const supabase = await createClient()

    // 認証状態確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // プロフィール取得
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // プロフィールが存在しない場合
        return NextResponse.json(
          { error: 'Profile not found', message: 'Profile does not exist' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ data: profile })
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// POST /api/profile - プロフィール作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証状態確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // リクエストボディ解析
    const body: CreateProfileRequest = await request.json()

    // バリデーション
    if (!body.github_id || !body.display_name) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Required fields missing' },
        { status: 400 }
      )
    }

    // プロフィール作成
    const profileData = {
      id: user.id,
      github_username: body.github_username,
      github_id: body.github_id,
      display_name: body.display_name,
      avatar_url: body.avatar_url,
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        // 重複エラー（既にプロフィールが存在）
        return NextResponse.json(
          { error: 'Profile exists', message: 'Profile already exists' },
          { status: 409 }
        )
      }
      throw error
    }

    return NextResponse.json({ data: profile }, { status: 201 })
  } catch (error) {
    console.error('Profile POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create profile' },
      { status: 500 }
    )
  }
}

// PUT /api/profile - プロフィール完全更新
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証状態確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // リクエストボディ解析
    const body: CreateProfileRequest = await request.json()

    // バリデーション
    if (!body.github_id || !body.display_name) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Required fields missing' },
        { status: 400 }
      )
    }

    // プロフィール完全更新
    const profileData = {
      github_username: body.github_username,
      github_id: body.github_id,
      display_name: body.display_name,
      avatar_url: body.avatar_url,
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Profile not found', message: 'Profile does not exist' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ data: profile })
  } catch (error) {
    console.error('Profile PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

// PATCH /api/profile - プロフィール部分更新
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証状態確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // リクエストボディ解析
    const body: UpdateProfileRequest = await request.json()

    // 更新するフィールドのみを含むオブジェクト作成
    const updateData: Partial<UpdateProfileRequest> = {}
    if (body.display_name !== undefined) updateData.display_name = body.display_name
    if (body.avatar_url !== undefined) updateData.avatar_url = body.avatar_url

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'No fields to update' },
        { status: 400 }
      )
    }

    // プロフィール更新
    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Profile not found', message: 'Profile does not exist' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ data: profile })
  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update profile' },
      { status: 500 }
    )
  }
}