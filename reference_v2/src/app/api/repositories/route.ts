import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { CreateRepositoryRequest } from '@/types'

// GET /api/repositories - ユーザーのリポジトリ一覧取得
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

    // リポジトリ一覧取得（最新アクセス順）
    const { data: repositories, error } = await supabase
      .from('user_repositories')
      .select('*')
      .eq('user_id', user.id)
      .order('last_accessed_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ data: repositories })
  } catch (error) {
    console.error('Repositories GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch repositories' },
      { status: 500 }
    )
  }
}

// POST /api/repositories - 新しいリポジトリ登録
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
    const body: CreateRepositoryRequest = await request.json()

    // バリデーション
    if (!body.github_repo_id || !body.owner || !body.name || !body.full_name) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Required fields missing' },
        { status: 400 }
      )
    }

    // リポジトリデータ作成
    const repositoryData = {
      user_id: user.id,
      github_repo_id: body.github_repo_id,
      owner: body.owner,
      name: body.name,
      full_name: body.full_name,
      description: body.description,
      default_branch: body.default_branch || 'main',
      language: body.language,
    }

    // 既存チェックとupsert
    const { data: repository, error } = await supabase
      .from('user_repositories')
      .upsert(repositoryData, {
        onConflict: 'user_id,github_repo_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ data: repository }, { status: 201 })
  } catch (error) {
    console.error('Repositories POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create repository' },
      { status: 500 }
    )
  }
}