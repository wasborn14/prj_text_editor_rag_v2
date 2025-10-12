import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

// GET /api/repositories/selected - 選択されているリポジトリを取得
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

    // 選択されているリポジトリを取得
    const { data, error } = await supabase
      .from('user_repositories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_selected', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 選択されているリポジトリがない場合
        return NextResponse.json({
          data: {
            selected_repository: null
          }
        })
      }
      throw error
    }

    return NextResponse.json({
      data: {
        selected_repository: data
      }
    })
  } catch (error) {
    console.error('Selected repository GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch selected repository' },
      { status: 500 }
    )
  }
}