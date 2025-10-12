import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { GitHubClient } from '@/lib/github'

// GET /api/github/repositories - GitHubからリポジトリ一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証状態確認
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'User not authenticated' },
        { status: 401 }
      )
    }

    // GitHub tokenの確認
    const githubToken = session.provider_token
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not found', message: 'GitHub authentication required' },
        { status: 401 }
      )
    }

    // URLパラメータ解析
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') || 'updated'
    const perPage = parseInt(searchParams.get('per_page') || '50')
    const type = searchParams.get('type') || 'all'

    // GitHub APIでリポジトリ一覧取得
    const github = new GitHubClient(githubToken)
    const repositories = await github.getUserRepos({
      sort: sort as 'updated' | 'created' | 'full_name',
      per_page: Math.min(perPage, 100), // 最大100件
      type: type as 'all' | 'owner' | 'member'
    })

    return NextResponse.json({ data: repositories })
  } catch (error) {
    console.error('GitHub repositories GET error:', error)

    // GitHub API固有のエラーハンドリング
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded', message: 'GitHub API rate limit exceeded' },
          { status: 429 }
        )
      }
      if (error.message.includes('401')) {
        return NextResponse.json(
          { error: 'GitHub authentication failed', message: 'Invalid GitHub token' },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch repositories from GitHub' },
      { status: 500 }
    )
  }
}