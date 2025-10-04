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
  const updateContent = useEditorStore(state => state.updateContent)

  const query = useQuery({
    queryKey: ['file-content', repositoryId, filePath],
    queryFn: () => fetchFileContent(repositoryId, filePath),
    enabled: enabled && !!repositoryId && !!filePath,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
    retry: 1,
    retryDelay: 1000,
  })

  // データ取得成功時の処理
  useEffect(() => {
    if (query.isSuccess && query.data) {
      const store = useEditorStore.getState()
      const activeTab = store.openTabs.find(tab => tab.path === filePath && tab.id === store.activeTabId)

      if (activeTab && activeTab.content === '') {
        // 初期ロード時はmarkDirty: falseで更新（未編集状態）
        updateContent(activeTab.id, query.data.content, query.data.sha, false)
      }
      onSuccess?.(query.data)
    }
    // updateContent, onSuccess, filePathは安定しているため依存配列から除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isSuccess, query.data?.sha])

  // エラー時の処理
  useEffect(() => {
    if (query.isError && query.error) {
      const store = useEditorStore.getState()
      const activeTab = store.openTabs.find(tab => tab.path === filePath && tab.id === store.activeTabId)

      if (activeTab && activeTab.content === '') {
        const errorMessage = `// Failed to load file: ${query.error.message || 'Unknown error'}`
        updateContent(activeTab.id, errorMessage, undefined, false)
      }
      onError?.(query.error)
    }
    // updateContent, onError, filePathは安定しているため依存配列から除外
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isError, query.error?.message])

  return query
}