export interface Profile {
  id: string
  user_id: string
  github_username: string | null
  github_id: number | null
  display_name: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface UserRepository {
  id: string
  user_id: string
  repository_full_name: string
  repository_url: string
  is_selected: boolean
  created_at: string
  updated_at: string
}
