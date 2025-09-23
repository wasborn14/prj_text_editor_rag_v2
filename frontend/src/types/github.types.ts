// GitHub API Types

export interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
  html_url: string
  type: string
  created_at: string
  updated_at: string
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  owner: GitHubUser
  private: boolean
  html_url: string
  description: string | null
  fork: boolean
  language: string | null
  default_branch: string
  size: number
  stargazers_count: number
  watchers_count: number
  forks_count: number
  archived: boolean
  disabled: boolean
  visibility: 'public' | 'private' | 'internal'
  pushed_at: string | null
  created_at: string
  updated_at: string
  permissions?: {
    admin: boolean
    maintain: boolean
    push: boolean
    triage: boolean
    pull: boolean
  }
}

export interface GitHubContent {
  name: string
  path: string
  sha: string
  size: number
  url: string
  html_url: string
  git_url: string
  download_url: string | null
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  content?: string // Base64 encoded for files
  encoding?: string
  _links: {
    self: string
    git: string
    html: string
  }
}

export interface GitHubTreeItem {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
  size?: number
  url: string
}

export interface GitHubTree {
  sha: string
  url: string
  tree: GitHubTreeItem[]
  truncated: boolean
}

// Repository selection for our app
export interface Repository {
  id: number
  name: string
  fullName: string
  owner: string
  description: string | null
  defaultBranch: string
  language: string | null
  private: boolean
  updatedAt: string
}

// File/Directory for our app
export interface FileItem {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  url?: string
}

// Repository with selection state (combines GitHub + Supabase)
export interface RepositoryWithSelection extends Repository {
  isSelected: boolean
  lastAccessedAt: string
  userRepoId: string // Supabase user_repositories.id
}