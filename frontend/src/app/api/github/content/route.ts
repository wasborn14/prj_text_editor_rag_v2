import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { Octokit } from '@octokit/rest'

// GET /api/github/content - GitHubからファイル/ディレクトリ内容取得
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
    const owner = searchParams.get('owner')
    const repo = searchParams.get('repo')
    const path = searchParams.get('path') || ''
    const ref = searchParams.get('ref') // ブランチ指定（オプション）

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Validation error', message: 'owner and repo parameters are required' },
        { status: 400 }
      )
    }

    // GitHub APIでコンテンツ取得
    const github = new Octokit({ auth: githubToken })

    const response = await github.repos.getContent({
      owner,
      repo,
      path,
      ...(ref && { ref })
    })

    // レスポンスデータの処理
    const content = response.data

    if (Array.isArray(content)) {
      // ディレクトリの場合：ファイル一覧を返す
      const items = content.map(item => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size || 0,
        download_url: item.download_url
      }))

      return NextResponse.json({ data: items })
    } else {
      // ファイルの場合：ファイル内容を返す
      if (content.type !== 'file') {
        return NextResponse.json(
          { error: 'Unsupported content type', message: 'Only file content is supported' },
          { status: 400 }
        )
      }

      const fileData = {
        content: content.content ? Buffer.from(content.content, 'base64').toString() : '',
        sha: content.sha,
        size: content.size,
        encoding: content.encoding || 'base64',
        url: content.url
      }

      return NextResponse.json({ data: fileData })
    }
  } catch (error) {
    console.error('GitHub content GET error:', error)

    // GitHub API固有のエラーハンドリング
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        return NextResponse.json(
          { error: 'Not found', message: 'File or directory not found' },
          { status: 404 }
        )
      }
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
      if (error.message.includes('403')) {
        return NextResponse.json(
          { error: 'Access denied', message: 'No permission to access this repository' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch content from GitHub' },
      { status: 500 }
    )
  }
}