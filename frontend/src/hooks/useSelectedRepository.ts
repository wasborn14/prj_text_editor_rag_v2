import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface SelectedRepository {
  id: string
  user_id: string
  repository_id: number
  repository_full_name: string
  repository_name: string
  repository_owner: string
  selected_at: string
  created_at: string
  updated_at: string
}

interface SaveRepositoryParams {
  repository_id: number
  repository_full_name: string
  repository_name: string
  repository_owner: string
}

export function useSelectedRepository() {
  const queryClient = useQueryClient()

  // 選択済みリポジトリを取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['selectedRepository'],
    queryFn: async () => {
      const response = await fetch('/api/selected-repository')
      if (!response.ok) {
        throw new Error('Failed to fetch selected repository')
      }
      const result = await response.json()
      return result.data as SelectedRepository | null
    },
    staleTime: 5 * 60 * 1000, // 5分
  })

  // リポジトリ選択を保存
  const saveMutation = useMutation({
    mutationFn: async (params: SaveRepositoryParams) => {
      const response = await fetch('/api/selected-repository', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })
      if (!response.ok) {
        throw new Error('Failed to save selected repository')
      }
      return response.json()
    },
    onSuccess: () => {
      // キャッシュを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ['selectedRepository'] })
    },
  })

  // リポジトリ選択を削除
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/selected-repository', {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete selected repository')
      }
      return response.json()
    },
    onSuccess: () => {
      // キャッシュを無効化
      queryClient.invalidateQueries({ queryKey: ['selectedRepository'] })
    },
  })

  return {
    selectedRepository: data,
    isLoading,
    error,
    saveSelectedRepository: saveMutation.mutateAsync,
    deleteSelectedRepository: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
