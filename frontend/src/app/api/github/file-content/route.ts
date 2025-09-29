import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { Octokit } from '@octokit/rest'

// GET /api/github/file-content - ファイル内容取得
export const GET = async (request: NextRequest) => {
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
    const repositoryId = searchParams.get('repository_id')
    const filePath = searchParams.get('path')
    const ref = searchParams.get('ref') // ブランチ指定（オプション）

    if (!repositoryId || !filePath) {
      return NextResponse.json(
        { error: 'Validation error', message: 'repository_id and path parameters are required' },
        { status: 400 }
      )
    }

    // リポジトリ情報を取得
    const { data: repository, error: repoError } = await supabase
      .from('user_repositories')
      .select('*')
      .eq('id', repositoryId)
      .eq('user_id', session.user.id)
      .single()

    if (repoError || !repository) {
      return NextResponse.json(
        { error: 'Repository not found', message: 'Repository does not exist or access denied' },
        { status: 404 }
      )
    }

    // GitHub APIでファイル内容取得
    const github = new Octokit({ auth: githubToken })

    const response = await github.repos.getContent({
      owner: repository.owner,
      repo: repository.name,
      path: filePath,
      ...(ref && { ref })
    })

    const content = response.data

    // ファイルの場合のみ処理
    if (Array.isArray(content)) {
      return NextResponse.json(
        { error: 'Directory not supported', message: 'This endpoint only supports files, not directories' },
        { status: 400 }
      )
    }

    if (content.type !== 'file') {
      return NextResponse.json(
        { error: 'Unsupported content type', message: 'Only file content is supported' },
        { status: 400 }
      )
    }

    // ファイル内容をデコード
    let fileContent = ''
    if (content.content) {
      try {
        fileContent = Buffer.from(content.content, 'base64').toString('utf-8')
      } catch (decodeError) {
        console.error('File content decode error:', decodeError)
        return NextResponse.json(
          { error: 'Decode error', message: 'Failed to decode file content' },
          { status: 500 }
        )
      }
    }

    const fileData = {
      content: fileContent,
      sha: content.sha,
      size: content.size,
      path: content.path,
      name: content.name,
      encoding: content.encoding || 'base64',
      url: content.url,
      download_url: content.download_url
    }

    return NextResponse.json({ data: fileData })

  } catch (error) {
    console.error('GitHub file content GET error:', error)

    // GitHub API固有のエラーハンドリング
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        return NextResponse.json(
          { error: 'File not found', message: 'The specified file was not found' },
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
          { error: 'Access denied', message: 'No permission to access this file' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch file content from GitHub' },
      { status: 500 }
    )
  }
}

// PUT /api/github/file-content - ファイル保存
export const PUT = async (request: NextRequest) => {
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

    // リクエストボディ解析
    const body = await request.json()
    const { repository_id, path, content, sha, message } = body

    if (!repository_id || !path || content === undefined || !sha) {
      return NextResponse.json(
        { error: 'Validation error', message: 'repository_id, path, content, and sha are required' },
        { status: 400 }
      )
    }

    // リポジトリ情報を取得
    const { data: repository, error: repoError } = await supabase
      .from('user_repositories')
      .select('*')
      .eq('id', repository_id)
      .eq('user_id', session.user.id)
      .single()

    if (repoError || !repository) {
      return NextResponse.json(
        { error: 'Repository not found', message: 'Repository does not exist or access denied' },
        { status: 404 }
      )
    }

    // GitHub APIでファイル更新
    const github = new Octokit({ auth: githubToken })

    const response = await github.repos.createOrUpdateFileContents({
      owner: repository.owner,
      repo: repository.name,
      path: path,
      message: message || `Update ${path}`,
      content: Buffer.from(content, 'utf-8').toString('base64'),
      sha: sha
    })

    return NextResponse.json({
      data: {
        content: response.data.content,
        commit: response.data.commit
      }
    })

  } catch (error) {
    console.error('GitHub file content PUT error:', error)

    // GitHub API固有のエラーハンドリング
    if (error instanceof Error) {
      if (error.message.includes('409')) {
        return NextResponse.json(
          { error: 'Conflict', message: 'File has been modified by another user. Please refresh and try again.' },
          { status: 409 }
        )
      }
      if (error.message.includes('404')) {
        return NextResponse.json(
          { error: 'File not found', message: 'The specified file was not found' },
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
          { error: 'Access denied', message: 'No permission to modify this file' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to save file to GitHub' },
      { status: 500 }
    )
  }
}