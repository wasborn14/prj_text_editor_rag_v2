import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface SaveFileRequest {
  repositoryId: string
  owner: string
  name: string
  filePath: string
  content: string
  message?: string
  sha?: string
}

export async function POST(request: NextRequest) {
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
    const accessToken = session.provider_token
    if (!accessToken) {
      return NextResponse.json(
        { error: 'GitHub token not found', message: 'GitHub authentication required' },
        { status: 401 }
      )
    }

    const { repositoryId, owner, name, filePath, content, message, sha }: SaveFileRequest = await request.json()

    if (!repositoryId || !owner || !name || !filePath || content === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'repositoryId, owner, name, filePath, and content are required' },
        { status: 400 }
      )
    }

    // リポジトリ所有権の確認（セキュリティのため）
    const { data: repository, error: repoError } = await supabase
      .from('user_repositories')
      .select('id')
      .eq('id', repositoryId)
      .eq('user_id', session.user.id)
      .single()

    if (repoError || !repository) {
      return NextResponse.json(
        { error: 'Repository not found', message: 'Repository does not exist or access denied' },
        { status: 403 }
      )
    }

    // ファイルを更新または作成
    const updateResponse = await fetch(
      `https://api.github.com/repos/${owner}/${name}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message || `Update ${filePath}`,
          content: Buffer.from(content, 'utf-8').toString('base64'),
          sha: sha, // 新規作成時はundefined、更新時は既存のsha
        }),
      }
    )

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json()
      return NextResponse.json(
        { error: `Failed to save file: ${errorData.message}` },
        { status: updateResponse.status }
      )
    }

    const result = await updateResponse.json()

    return NextResponse.json({
      success: true,
      sha: result.content.sha,
      message: 'File saved successfully'
    })

  } catch (error) {
    console.error('Save file error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}