import { Octokit } from '@octokit/rest'

export class GitHubClient {
  private octokit: Octokit

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken })
  }

  async getUserRepos() {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50,
      type: 'all',
      visibility: 'public'
    })

    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.default_branch || 'main',
      updatedAt: repo.updated_at,
      language: repo.language,
      owner: repo.owner.login,
    }))
  }
}