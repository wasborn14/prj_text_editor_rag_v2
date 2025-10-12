// Supabase Database Types

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: ProfileUpdate
      }
      user_repositories: {
        Row: UserRepository
        Insert: UserRepositoryInsert
        Update: UserRepositoryUpdate
      }
    }
  }
}

// Profile Types
export interface Profile {
  id: string // UUID
  github_username: string | null
  github_id: number | null
  display_name: string | null
  avatar_url: string | null
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface ProfileInsert {
  id: string // Required for insert
  github_username?: string | null
  github_id?: number | null
  display_name?: string | null
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface ProfileUpdate {
  github_username?: string | null
  github_id?: number | null
  display_name?: string | null
  avatar_url?: string | null
  updated_at?: string
}

// User Repository Types
export interface UserRepository {
  id: string // UUID
  user_id: string // UUID
  github_repo_id: number
  owner: string
  name: string
  full_name: string
  description: string | null
  default_branch: string
  language: string | null
  is_selected: boolean
  last_accessed_at: string // ISO timestamp
  created_at: string // ISO timestamp
  updated_at: string // ISO timestamp
}

export interface UserRepositoryInsert {
  id?: string // Optional, auto-generated
  user_id: string
  github_repo_id: number
  owner: string
  name: string
  full_name: string
  description?: string | null
  default_branch?: string
  language?: string | null
  is_selected?: boolean
  last_accessed_at?: string
  created_at?: string
  updated_at?: string
}

export interface UserRepositoryUpdate {
  github_repo_id?: number
  owner?: string
  name?: string
  full_name?: string
  description?: string | null
  default_branch?: string
  language?: string | null
  is_selected?: boolean
  last_accessed_at?: string
  updated_at?: string
}