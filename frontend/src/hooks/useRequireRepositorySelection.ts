import { useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

/**
 * リポジトリ選択が必要なページで使用するカスタムフック
 * 選択されていない場合は /repository-setup にリダイレクト
 */
export function useRequireRepositorySelection() {
  const selectedRepository = useAuthStore((state) => state.selectedRepository)
  const repositorySetupCompleted = useAuthStore((state) => state.repositorySetupCompleted)
  const loading = useAuthStore((state) => state.loading)
  const user = useAuthStore((state) => state.user)
  const router = useRouter()

  useLayoutEffect(() => {
    if (loading || !user) return

    // リポジトリ選択が完了していない場合
    if (!repositorySetupCompleted || !selectedRepository) {
      router.replace('/repository-setup')
    }
  }, [selectedRepository, repositorySetupCompleted, loading, user, router])

  return {
    selectedRepository,
    repositorySetupCompleted,
    loading: loading || !repositorySetupCompleted,
    isReady: !!selectedRepository && repositorySetupCompleted && !loading
  }
}