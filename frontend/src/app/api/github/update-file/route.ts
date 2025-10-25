import { NextRequest, NextResponse } from 'next/server'
import { Octokit } from '@octokit/rest'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const octokit = new Octokit({ auth: token })

    const body = await request.json()
    const { owner, repo, path, content, sha, message } = body

    if (!owner || !repo || !path || !content || !sha) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Base64エンコード
    const encodedContent = Buffer.from(content).toString('base64')

    // GitHub APIでファイルを更新
    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: message || `Update ${path}`,
      content: encodedContent,
      sha,
    })

    return NextResponse.json({
      success: true,
      sha: response.data.content?.sha,
    })
  } catch (error: unknown) {
    console.error('GitHub API error:', error)

    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status: number }).status
      if (status === 409) {
        return NextResponse.json(
          { error: 'File has been modified. Please reload.' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to update file' },
      { status: 500 }
    )
  }
}
