import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface RenameFileRequest {
  owner: string
  repo: string
  oldPath: string
  newPath: string
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

    const { owner, repo, oldPath, newPath, type, message }: RenameFileRequest =
      await request.json()

    // パラメータ検証
    if (!owner || !repo || !oldPath || !newPath) {
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

    const commitMessage = message || `Rename ${type === 'dir' ? 'folder' : 'file'}: ${oldPath} → ${newPath}`

    if (type === 'file') {
      // ファイルの名前変更
      const result = await renameSingleFile(githubToken, owner, repo, oldPath, newPath, commitMessage)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 500 }
        )
      }

      return NextResponse.json({
        success: true,
        oldPath,
        newPath,
        type: 'file',
        sha: result.sha
      })
    } else {
      // ディレクトリの名前変更（再帰的）
      const result = await renameDirectory(githubToken, owner, repo, oldPath, newPath, commitMessage)
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 500 }
        )
      }

      return NextResponse.json({
        success: true,
        oldPath,
        newPath,
        type: 'dir',
        renamedFiles: result.renamedFiles
      })
    }
  } catch (error) {
    console.error('Error renaming file/folder:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 単一ファイルの名前変更（内容を取得して新しいパスに作成し、古いパスを削除）
async function renameSingleFile(
  token: string,
  owner: string,
  repo: string,
  oldPath: string,
  newPath: string,
  message: string
): Promise<{ success: boolean; error?: string; status?: number; sha?: string }> {
  try {
    // ファイルの内容を取得
    const getResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${oldPath}`,
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
        error: errorData.message || 'Failed to get file content',
        status: getResponse.status
      }
    }

    const fileData = await getResponse.json()

    // 新しいパスにファイルを作成
    const createResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${newPath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          content: fileData.content,
          sha: undefined // 新規作成なのでshaは不要
        })
      }
    )

    if (!createResponse.ok) {
      const errorData = await createResponse.json()
      return {
        success: false,
        error: errorData.message || 'Failed to create file at new path',
        status: createResponse.status
      }
    }

    const newFileData = await createResponse.json()

    // 古いパスのファイルを削除
    const deleteResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${oldPath}`,
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
        error: errorData.message || 'Failed to delete old file',
        status: deleteResponse.status
      }
    }

    return { success: true, sha: newFileData.content?.sha }
  } catch (error) {
    console.error('Error in renameSingleFile:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// ディレクトリの再帰的名前変更
async function renameDirectory(
  token: string,
  owner: string,
  repo: string,
  oldDirPath: string,
  newDirPath: string,
  message: string
): Promise<{ success: boolean; error?: string; status?: number; renamedFiles?: number }> {
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
    const filesToRename = (treeData.tree as GitTreeItem[]).filter((item) =>
      item.type === 'blob' && item.path.startsWith(oldDirPath + '/')
    )

    if (filesToRename.length === 0) {
      return {
        success: false,
        error: 'Directory is empty or not found'
      }
    }

    // 各ファイルを名前変更
    for (const file of filesToRename) {
      const relativePath = file.path.substring(oldDirPath.length)
      const newFilePath = newDirPath + relativePath
      const result = await renameSingleFile(token, owner, repo, file.path, newFilePath, message)
      if (!result.success) {
        return {
          success: false,
          error: `Failed to rename file: ${file.path}. ${result.error}`
        }
      }
    }

    return {
      success: true,
      renamedFiles: filesToRename.length
    }
  } catch (error) {
    console.error('Error in renameDirectory:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
