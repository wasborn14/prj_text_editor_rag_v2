import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface DeleteFileRequest {
  owner: string
  repo: string
  path: string
  type: 'file' | 'dir'
  message?: string
}

interface GitTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { owner, repo, path, type, message }: DeleteFileRequest =
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

    const commitMessage = message || `Delete ${type === 'dir' ? 'folder' : 'file'}: ${path}`

    if (type === 'file') {
      // ファイルの削除
      const result = await deleteSingleFile(githubToken, owner, repo, path, commitMessage)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 500 }
        )
      }

      return NextResponse.json({
        success: true,
        path,
        type: 'file'
      })
    } else {
      // ディレクトリの削除（再帰的）
      const result = await deleteDirectory(githubToken, owner, repo, path, commitMessage)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 500 }
        )
      }

      return NextResponse.json({
        success: true,
        path,
        type: 'dir',
        deletedFiles: result.deletedFiles
      })
    }
  } catch (error) {
    console.error('Error deleting file/folder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 単一ファイルの削除
async function deleteSingleFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  message: string
): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    // ファイルのSHAを取得
    const getResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    )

    if (!getResponse.ok) {
      const errorData = await getResponse.json()
      return {
        success: false,
        error: errorData.message || 'Failed to get file SHA',
        status: getResponse.status
      }
    }

    const fileData = await getResponse.json()

    // ファイルを削除
    const deleteResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          sha: fileData.sha
        })
      }
    )

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json()
      return {
        success: false,
        error: errorData.message || 'Failed to delete file',
        status: deleteResponse.status
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteSingleFile:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ディレクトリの再帰的削除
async function deleteDirectory(
  token: string,
  owner: string,
  repo: string,
  dirPath: string,
  message: string
): Promise<{ success: boolean; error?: string; status?: number; deletedFiles?: number }> {
  try {
    // デフォルトブランチを取得
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    )

    if (!repoResponse.ok) {
      return {
        success: false,
        error: 'Failed to get repository info',
        status: repoResponse.status
      }
    }

    const repoData = await repoResponse.json()
    const defaultBranch = repoData.default_branch

    // ディレクトリ内の全ファイルを取得（再帰的）
    const filesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      }
    )

    if (!filesResponse.ok) {
      return {
        success: false,
        error: 'Failed to get directory tree',
        status: filesResponse.status
      }
    }

    const treeData = await filesResponse.json()

    // 指定されたディレクトリ配下のファイルのみをフィルタリング
    const filesToDelete = (treeData.tree as GitTreeItem[]).filter((item) =>
      item.type === 'blob' && item.path.startsWith(dirPath + '/')
    )

    if (filesToDelete.length === 0) {
      return {
        success: false,
        error: 'Directory is empty or not found'
      }
    }

    // 各ファイルを削除
    for (const file of filesToDelete) {
      const result = await deleteSingleFile(token, owner, repo, file.path, message)
      if (!result.success) {
        return {
          success: false,
          error: `Failed to delete file: ${file.path}. ${result.error}`
        }
      }
    }

    return {
      success: true,
      deletedFiles: filesToDelete.length
    }
  } catch (error) {
    console.error('Error in deleteDirectory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
