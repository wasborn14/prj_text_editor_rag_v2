// API Request/Response Types

import { Repository } from './github.types'
import { Profile, UserRepository } from './database.types'

// Common API Response Structure
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  error: string
  message: string
  status: number
}

// Profile API Types
export type ProfileResponse = ApiResponse<Profile>

export interface CreateProfileRequest {
  github_username: string
  github_id: number
  display_name: string
  avatar_url: string
}

export interface UpdateProfileRequest {
  display_name?: string
  avatar_url?: string
}

// Repository API Types
export type RepositoryListResponse = ApiResponse<UserRepository[]>

export type RepositoryResponse = ApiResponse<UserRepository>

export interface CreateRepositoryRequest {
  github_repo_id: number
  owner: string
  name: string
  full_name: string
  description?: string | null
  default_branch?: string
  language?: string | null
}

export interface UpdateRepositoryRequest {
  description?: string | null
  default_branch?: string
  language?: string | null
  last_accessed_at?: string
}

export interface SelectRepositoryRequest {
  repository_id: string
}

export type SelectRepositoryResponse = ApiResponse<{
  selected: UserRepository
  previous?: UserRepository
}>

// GitHub Integration API Types
export type GitHubRepositoryListResponse = ApiResponse<Repository[]>

export interface SyncRepositoryRequest {
  repository_full_name: string
}

export type SyncRepositoryResponse = ApiResponse<{
  synced: Repository
  updated_fields: string[]
}>

// File Content API Types (GitHub proxy)
export interface FileContentRequest {
  owner: string
  repo: string
  path: string
  ref?: string // branch/commit
}

export type FileContentResponse = ApiResponse<{
  content: string
  sha: string
  size: number
  encoding: string
  url: string
}>

export interface DirectoryContentRequest {
  owner: string
  repo: string
  path?: string
  ref?: string
}

export type DirectoryContentResponse = ApiResponse<{
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  download_url?: string
}[]>

// Search/Filter Types
export interface RepositoryFilter {
  language?: string
  sort?: 'name' | 'updated' | 'created'
  order?: 'asc' | 'desc'
  search?: string
}

export interface PaginationParams {
  page?: number
  per_page?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number
    per_page: number
    total: number
    total_pages: number
  }
}

// RAG API Integration Types
export interface RAGSyncRequest {
  repository: string
}

export type RAGSyncResponse = ApiResponse<{
  repository: string
  status: 'synced' | 'syncing' | 'failed'
  documents_count?: number
  last_synced_at?: string
}>

export interface RAGSearchRequest {
  query: string
  repository: string
  limit?: number
}

export type RAGSearchResponse = ApiResponse<{
  results: {
    content: string
    file_path: string
    score: number
    chunk_id: string
  }[]
  query: string
  repository: string
}>

export interface RAGChatRequest {
  message: string
  repository: string
  context?: string[]
}

export type RAGChatResponse = ApiResponse<{
  response: string
  sources: {
    file_path: string
    chunk_id: string
    relevance_score: number
  }[]
  repository: string
}>