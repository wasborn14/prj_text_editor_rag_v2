import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface GitHubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url: string
}

interface GitHubTreeResponse {
  sha: string
  url: string
  tree: GitHubTreeItem[]
  truncated: boolean
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  children?: FileTreeNode[]
}

// ツリー構造を構築する関数
function buildFileTree(treeItems: GitHubTreeItem[]): FileTreeNode[] {
  const pathMap = new Map<string, FileTreeNode>()
  const rootNodes: FileTreeNode[] = []

  // まず全てのノードを作成
  treeItems.forEach(item => {
    const parts = item.path.split('/')
    const name = parts[parts.length - 1]

    const node: FileTreeNode = {
      name,
      path: item.path,
      type: item.type === 'blob' ? 'file' : 'dir',
      size: item.size,
      children: item.type === 'tree' ? [] : undefined
    }

    pathMap.set(item.path, node)
  })

  // 親子関係を構築
  treeItems.forEach(item => {
    const parts = item.path.split('/')
    const node = pathMap.get(item.path)!

    if (parts.length === 1) {
      // ルートレベル
      rootNodes.push(node)
    } else {
      // 親ディレクトリを探す
      const parentPath = parts.slice(0, -1).join('/')
      const parent = pathMap.get(parentPath)

      if (parent && parent.children) {
        parent.children.push(node)
      }
    }
  })

  // ソート関数
  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((a, b) => {
      // ディレクトリを先に、その後ファイル名でソート
      if (a.type !== b.type) {
        return a.type === 'dir' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })

    // 子ディレクトリも再帰的にソート
    nodes.forEach(node => {
      if (node.children) {
        sortNodes(node.children)
      }
    })
  }

  sortNodes(rootNodes)
  return rootNodes
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const { data: { session } } = await supabase.auth.getSession()

    if (!user || !session?.provider_token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // リポジトリ情報を取得
    const { data: repository, error: repoError } = await supabase
      .from('user_repositories')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (repoError || !repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    // Git Tree APIを使用して全ディレクトリ構造を取得
    const githubResponse = await fetch(
      `https://api.github.com/repos/${repository.full_name}/git/trees/${repository.default_branch}?recursive=1`,
      {
        headers: {
          'Authorization': `Bearer ${session.provider_token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'RAG-Text-Editor'
        }
      }
    )

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text()
      console.error('GitHub API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch repository tree' },
        { status: githubResponse.status }
      )
    }

    const treeData: GitHubTreeResponse = await githubResponse.json()

    // ツリー構造を構築
    const fileTree = buildFileTree(treeData.tree)

    return NextResponse.json({
      data: {
        contents: fileTree,
        repository: {
          id: repository.id,
          full_name: repository.full_name,
          default_branch: repository.default_branch
        },
        truncated: treeData.truncated
      }
    })

  } catch (error) {
    console.error('Error fetching repository files:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}