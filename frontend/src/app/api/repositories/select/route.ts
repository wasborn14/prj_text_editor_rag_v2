import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { SelectRepositoryRequest } from '@/types'

// POST /api/repositories/select - リポジトリ選択
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
    const body: SelectRepositoryRequest = await request.json()

    if (!body.repository_id) {
      return NextResponse.json(
        { error: 'Validation error', message: 'repository_id is required' },
        { status: 400 }
      )
    }

    // トランザクション処理で選択状態を変更
    const { error } = await supabase.rpc('select_repository', {
      p_user_id: user.id,
      p_repository_id: body.repository_id
    })

    if (error) {
      if (error.message?.includes('not found')) {
        return NextResponse.json(
          { error: 'Repository not found', message: 'Repository does not exist or access denied' },
          { status: 404 }
        )
      }
      throw error
    }

    // 選択されたリポジトリと以前選択されていたリポジトリを取得
    const { data: selectedRepo, error: selectError } = await supabase
      .from('user_repositories')
      .select('*')
      .eq('id', body.repository_id)
      .eq('user_id', user.id)
      .single()

    if (selectError) {
      throw selectError
    }

    return NextResponse.json({
      data: {
        selected: selectedRepo,
        message: 'Repository selected successfully'
      }
    })
  } catch (error) {
    console.error('Repository select error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to select repository' },
      { status: 500 }
    )
  }
}

// GET /api/repositories/select - 現在選択中のリポジトリ取得
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

    // 選択中のリポジトリ取得
    const { data: repository, error } = await supabase
      .from('user_repositories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_selected', true)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!repository) {
      return NextResponse.json(
        { error: 'No repository selected', message: 'No repository is currently selected' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: repository })
  } catch (error) {
    console.error('Selected repository GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch selected repository' },
      { status: 500 }
    )
  }
}