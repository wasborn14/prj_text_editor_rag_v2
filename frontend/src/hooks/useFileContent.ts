'use client'

import { useQuery } from '@tanstack/react-query'

interface FileContentParams {
  repositoryId: string
  filePath: string
  enabled?: boolean
}

interface FileContentResponse {
  content: string
  sha: string
  size: number
  path: string
  name: string
  encoding: string
  url: string
  download_url: string
}

const fetchFileContent = async (repositoryId: string, filePath: string): Promise<FileContentResponse> => {
  const response = await fetch(
    `/api/github/file-content?repository_id=${encodeURIComponent(repositoryId)}&path=${encodeURIComponent(filePath)}`
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to fetch file content')
  }

  const result = await response.json()
  return result.data
}

export const useFileContent = ({ repositoryId, filePath, enabled = true }: FileContentParams) => {
  return useQuery({
    queryKey: ['file-content', repositoryId, filePath],
    queryFn: () => fetchFileContent(repositoryId, filePath),
    enabled: enabled && !!repositoryId && !!filePath,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 1,
    retryDelay: 1000,
  })
}