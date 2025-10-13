import { Octokit } from '@octokit/rest'

export interface Repository {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  updated_at: string
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
      console.log(`📂 Fetching repository tree: ${owner}/${repo}`)

      // デフォルトブランチを取得
      const { data: repoData } = await this.octokit.repos.get({
        owner,
        repo,
      })
      const defaultBranch = branch || repoData.default_branch
      console.log(`🌿 Using branch: ${defaultBranch}`)

      // ブランチの最新コミットを取得
      const { data: branchData } = await this.octokit.repos.getBranch({
        owner,
        repo,
        branch: defaultBranch,
      })
      console.log(`📌 Latest commit SHA: ${branchData.commit.sha}`)
      console.log(`🌳 Tree SHA: ${branchData.commit.commit.tree.sha}`)

      // コミットSHAからツリーを再帰的に取得
      const { data } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: branchData.commit.commit.tree.sha,
        recursive: 'true',
      })

      const files = (data.tree || [])
        .filter((item) => item.path && item.type && item.sha)
        .map((item) => ({
          path: item.path!,
          type: item.type === 'tree' ? 'dir' : 'file',
          sha: item.sha!,
          size: item.size,
          url: item.url!,
        }))

      console.log(`✅ Successfully fetched ${files.length} items from repository tree`)
      console.log(
        `   - Files: ${files.filter((f) => f.type === 'file').length}`
      )
      console.log(
        `   - Directories: ${files.filter((f) => f.type === 'dir').length}`
      )

      return files
    } catch (error) {
      console.error('❌ Failed to fetch repository tree:', error)
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
}
