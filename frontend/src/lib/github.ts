import { Octokit } from '@octokit/rest'

export class GitHubClient {
  private octokit: Octokit

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken })
  }

  async getUserRepos(options?: {
    sort?: 'updated' | 'created' | 'full_name'
    per_page?: number
    type?: 'all' | 'owner' | 'member'
  }) {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: options?.sort || 'updated',
      per_page: options?.per_page || 50,
      type: options?.type || 'all'
    })

    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      default_branch: repo.default_branch || 'main',
      defaultBranch: repo.default_branch || 'main',
      updatedAt: repo.updated_at,
      pushed_at: repo.pushed_at,
      language: repo.language,
      owner: repo.owner.login,
    }))
  }
}