import { Octokit } from '@octokit/rest'

export interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  updated_at: string | null
  language: string | null
  stargazers_count: number
}

export interface FileTreeItem {
  path: string
  type: 'file' | 'dir'
  sha: string
  size?: number
  url: string
}

export interface FileContent {
  path: string
  content: string
  sha: string
  size: number
  encoding: string
}

export class GitHubClient {
  private octokit: Octokit

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
    })
  }

  async getRepositories(): Promise<Repository[]> {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
        affiliation: 'owner,collaborator',
      })

      return data.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        private: repo.private,
        html_url: repo.html_url,
        updated_at: repo.updated_at,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
      }))
    } catch (error) {
      console.error('Failed to fetch repositories:', error)
      throw new Error('GitHubリポジトリの取得に失敗しました')
    }
  }

  async getRepository(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      })
      return data
    } catch (error) {
      console.error('Failed to fetch repository:', error)
      throw new Error('リポジトリの取得に失敗しました')
    }
  }

  async getRepositoryTree(
    owner: string,
    repo: string,
    branch?: string
  ): Promise<FileTreeItem[]> {
    try {
      // デフォルトブランチを取得
      const { data: repoData } = await this.octokit.repos.get({
        owner,
        repo,
      })
      const targetBranch = branch || repoData.default_branch

      // ブランチの最新コミットを取得
      const { data: branchData } = await this.octokit.repos.getBranch({
        owner,
        repo,
        branch: targetBranch,
        headers: {
          'If-None-Match': '',
        },
      })

      // コミットSHAからツリーを再帰的に取得
      const { data } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: branchData.commit.commit.tree.sha,
        recursive: 'true',
        headers: {
          'If-None-Match': '',
        },
      })

      const files = (data.tree || [])
        .filter((item) => item.path && item.type && item.sha)
        .map((item) => ({
          path: item.path!,
          type: (item.type === 'tree' ? 'dir' : 'file') as 'file' | 'dir',
          sha: item.sha!,
          size: item.size,
          url: item.url!,
        }))

      return files
    } catch (error) {
      console.error('Failed to fetch repository tree:', error)
      throw new Error('リポジトリツリーの取得に失敗しました')
    }
  }

  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<FileContent> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        headers: {
          'If-None-Match': '',
        },
      })

      if (Array.isArray(data) || data.type !== 'file') {
        throw new Error('指定されたパスはファイルではありません')
      }

      return {
        path: data.path,
        content: data.content
          ? Buffer.from(data.content, 'base64').toString('utf-8')
          : '',
        sha: data.sha,
        size: data.size,
        encoding: data.encoding,
      }
    } catch (error) {
      console.error('Failed to fetch file content:', error)
      throw new Error('ファイルコンテンツの取得に失敗しました')
    }
  }

  async verifyToken(): Promise<boolean> {
    try {
      await this.octokit.users.getAuthenticated()
      return true
    } catch (error) {
      console.error('Token verification failed:', error)
      return false
    }
  }

  /**
   * ファイル移動を1コミットで実行
   * base_treeを使わず、完全な新しいツリーを作成することで削除と作成の競合を回避
   */
  async moveFiles(
    owner: string,
    repo: string,
    moves: Array<{ oldPath: string; newPath: string }>,
    currentTree: FileTreeItem[],
    message: string,
    branch: string = 'main'
  ): Promise<string> {
    try {
      // 1. 現在のブランチの最新コミットを取得
      const branchData = await this.octokit.repos.getBranch({
        owner,
        repo,
        branch,
        headers: {
          'If-None-Match': '',
        },
      })
      const latestCommitSHA = branchData.data.commit.sha

      // 3. 移動マップを作成
      const moveMap = new Map(moves.map((m) => [m.oldPath, m.newPath]))

      // 4. 新しいツリーを構築（移動を反映）
      const newTreeItems: Array<{
        path: string
        mode: '100644' | '100755' | '040000' | '160000' | '120000'
        type: 'blob' | 'tree'
        sha: string
      }> = []

      for (const item of currentTree) {
        // ディレクトリはスキップ（ファイルのみを含める）
        if (item.type === 'dir') continue

        // 移動元のパスをスキップ
        if (moveMap.has(item.path)) {
          // 移動先のパスで追加
          newTreeItems.push({
            path: moveMap.get(item.path)!,
            mode: '100644',
            type: 'blob',
            sha: item.sha,
          })
        } else if (
          // 移動元ディレクトリ配下のファイルをスキップ & 移動先に追加
          Array.from(moveMap.keys()).some((oldPath) => item.path.startsWith(oldPath + '/'))
        ) {
          // 該当する移動元ディレクトリを見つける
          const moveDirEntry = moves.find((m) => item.path.startsWith(m.oldPath + '/'))
          if (moveDirEntry) {
            const relativePath = item.path.substring(moveDirEntry.oldPath.length)
            newTreeItems.push({
              path: moveDirEntry.newPath + relativePath,
              mode: '100644',
              type: 'blob',
              sha: item.sha,
            })
          }
        } else {
          // 移動に関係ないファイルはそのまま
          newTreeItems.push({
            path: item.path,
            mode: '100644',
            type: 'blob',
            sha: item.sha,
          })
        }
      }

      // 5. 新しいツリーを作成（base_treeなし）
      const newTree = await this.octokit.git.createTree({
        owner,
        repo,
        tree: newTreeItems,
      })

      // 6. 新しいコミットを作成
      const newCommit = await this.octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: newTree.data.sha,
        parents: [latestCommitSHA],
      })

      // 7. ブランチの参照を更新
      await this.octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.data.sha,
      })

      return newCommit.data.sha
    } catch (error) {
      console.error('Failed to move files:', error)
      throw error
    }
  }
}
