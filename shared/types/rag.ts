export interface SearchResult {
  content: string;
  metadata: {
    path: string;
    name: string;
    sha: string;
    directory: string;
    depth: number;
    chunk_index: number;
    total_chunks: number;
    file_type: string;
    file_size: number;
  };
  score: number;
}

export interface SearchRequest {
  query: string;
  repository: string;
  limit?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export interface SyncRequest {
  repository: string;
  force?: boolean;
}

export interface DirectorySearchRequest {
  query: string;
  repository: string;
  directory: string;
  limit?: number;
}

export interface ChatRequest {
  message: string;
  repository: string;
  context_limit?: number;
}

export interface RepositoryStructureResponse {
  repository: string;
  structure: Record<string, any>;
  total_files: number;
}