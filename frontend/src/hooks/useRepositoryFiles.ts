import { useQuery } from '@tanstack/react-query'
import { FileTreeNode } from '@/components/molecules/FileTree/FileTree'

interface RepositoryFilesResponse {
  contents: FileTreeNode[]
  repository: {
    id: string
    full_name: string
    default_branch: string
  }
  truncated: boolean
}

interface UseRepositoryFilesParams {
  repositoryId: string
  enabled?: boolean
}

async function fetchRepositoryFiles(repositoryId: string): Promise<RepositoryFilesResponse> {
  const url = new URL(`/api/repositories/${repositoryId}/files`, window.location.origin)

  const response = await fetch(url.toString())

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch repository files')
  }

  const result = await response.json()
  return result.data
}

export function useRepositoryFiles({ repositoryId, enabled = true }: UseRepositoryFilesParams) {
  return useQuery({
    queryKey: ['repository-files', repositoryId],
    queryFn: () => fetchRepositoryFiles(repositoryId),
    enabled: enabled && !!repositoryId,
    staleTime: 5 * 60 * 1000, // 5分間はキャッシュを使用
    gcTime: 10 * 60 * 1000, // 10分間ガベージコレクションを遅延
  })
}