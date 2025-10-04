'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'

interface FileContentParams {
  repositoryId: string
  filePath: string
  enabled?: boolean
  onSuccess?: (data: FileContentResponse) => void
  onError?: (error: Error) => void
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

export const useFileContent = ({
  repositoryId,
  filePath,
  enabled = true,
  onSuccess,
  onError
}: FileContentParams) => {
  const { updateContent, openTabs, activeTabId } = useEditorStore()
  const query = useQuery({
    queryKey: ['file-content', repositoryId, filePath],
    queryFn: () => fetchFileContent(repositoryId, filePath),
    enabled: enabled && !!repositoryId && !!filePath,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 1,
    retryDelay: 1000,
  })

  useEffect(() => {
    if (query.isSuccess && query.data) {
      // アクティブタブの内容が空の場合のみ更新
      const activeTab = openTabs.find(tab => tab.id === activeTabId)
      if (activeTab && activeTab.content === '' && activeTab.path === filePath) {
        updateContent(activeTab.id, query.data.content, query.data.sha)
      }
      onSuccess?.(query.data)
    }
  }, [query.isSuccess, query.data, onSuccess, openTabs, activeTabId, updateContent, filePath])

  useEffect(() => {
    if (query.isError && query.error) {
      // アクティブタブにエラーメッセージを表示
      const activeTab = openTabs.find(tab => tab.id === activeTabId)
      if (activeTab && activeTab.content === '' && activeTab.path === filePath) {
        const errorMessage = `// Failed to load file: ${query.error.message || 'Unknown error'}`
        updateContent(activeTab.id, errorMessage)
      }
      onError?.(query.error)
    }
  }, [query.isError, query.error, onError, openTabs, activeTabId, updateContent, filePath])

  return query
}