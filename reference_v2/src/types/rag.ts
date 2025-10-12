// RAG API型定義

export interface SearchResult {
  content: string
  metadata: {
    path: string
    name: string
    chunk_index: number
    total_chunks?: number
    sha?: string
  }
  score: number
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  error?: string
}

export interface ChatSource {
  path: string
  relevance: number
  chunk_index: number
  preview: string
}

export interface ChatResponse {
  answer: string
  sources: ChatSource[]
  context_used: number
  repository: string
  debug?: {
    total_search_results: number
    all_results: Array<{
      path: string
      score: number
      preview: string
    }>
    context_limit: number
  }
  error?: string
}

export interface SyncResponse {
  status: 'success' | 'error'
  repository: string
  files_synced: number
  message: string
  error?: string
}

export interface SearchRequest {
  query: string
  repository: string
  limit?: number
}

export interface ChatRequest {
  message: string
  repository: string
  context_limit?: number
}

export interface SyncRequest {
  repository: string
  force?: boolean
}
