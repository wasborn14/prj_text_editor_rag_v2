import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface CreateFileRequest {
  owner: string
  repo: string
  path: string
  content?: string
  message?: string
  type: 'file' | 'folder'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { owner, repo, path, content = '', message, type }: CreateFileRequest =
      await request.json()

    // パラメータ検証
    if (!owner || !repo || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const githubToken = session.provider_token
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not found' },
        { status: 401 }
      )
    }

    // フォルダ作成の場合は.gitkeepファイルを作成
    const filePath = type === 'folder' ? `${path}/.gitkeep` : path

    // ファイル作成時、contentが空の場合はパスをデフォルトコンテンツとして使用（ユニークなSHA生成のため）
    let fileContent = type === 'folder' ? '' : content

    if (type === 'file' && !content) {
      // filePathから拡張子を除去（例: "dir/test.md" → "dir/test"）
      const pathWithoutExt = filePath.replace(/\.(md|txt|js|ts|json|yaml|yml)$/i, '')
      fileContent = `# ${pathWithoutExt}\n\n`
    }

    // Base64エンコード
    const encodedContent = Buffer.from(fileContent).toString('base64')

    // コミットメッセージ
    const commitMessage =
      message || `Create ${type === 'folder' ? 'folder' : 'file'}: ${path}`

    // GitHub API: ファイル作成
    const createResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: commitMessage,
          content: encodedContent
        })
      }
    )

    if (!createResponse.ok) {
      const errorData = await createResponse.json()
      return NextResponse.json(
        {
          error: errorData.message || 'Failed to create file',
          details: errorData
        },
        { status: createResponse.status }
      )
    }

    const responseData = await createResponse.json()

    return NextResponse.json({
      success: true,
      path: type === 'folder' ? path : filePath,
      sha: responseData.content?.sha,
      type
    })
  } catch (error) {
    console.error('Error creating file/folder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
