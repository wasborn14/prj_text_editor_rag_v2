import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { UpdateRepositoryRequest } from '@/types'

// GET /api/repositories/[id] - 特定リポジトリ取得
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params

    // 認証状態確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // リポジトリ取得
    const { data: repository, error } = await supabase
      .from('user_repositories')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Repository not found', message: 'Repository does not exist' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ data: repository })
  } catch (error) {
    console.error('Repository GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch repository' },
      { status: 500 }
    )
  }
}

// PATCH /api/repositories/[id] - リポジトリ情報更新
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params

    // 認証状態確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // リクエストボディ解析
    const body: UpdateRepositoryRequest = await request.json()

    // 更新するフィールドのみを含むオブジェクト作成
    const updateData: Partial<UpdateRepositoryRequest> = {}
    if (body.description !== undefined) updateData.description = body.description
    if (body.default_branch !== undefined) updateData.default_branch = body.default_branch
    if (body.language !== undefined) updateData.language = body.language
    if (body.last_accessed_at !== undefined) updateData.last_accessed_at = body.last_accessed_at

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'No fields to update' },
        { status: 400 }
      )
    }

    // リポジトリ更新
    const { data: repository, error } = await supabase
      .from('user_repositories')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Repository not found', message: 'Repository does not exist' },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ data: repository })
  } catch (error) {
    console.error('Repository PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update repository' },
      { status: 500 }
    )
  }
}

// DELETE /api/repositories/[id] - リポジトリ削除
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const params = await context.params

    // 認証状態確認
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // リポジトリ削除
    const { error } = await supabase
      .from('user_repositories')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Repository deleted successfully' })
  } catch (error) {
    console.error('Repository DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to delete repository' },
      { status: 500 }
    )
  }
}