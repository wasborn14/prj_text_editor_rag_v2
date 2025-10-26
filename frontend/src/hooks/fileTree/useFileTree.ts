import { useQuery } from '@tanstack/react-query'
import { GitHubClient, Repository } from '@/lib/github'
import { useFileTreeStore } from '@/stores/fileTreeStore'
import { useEffect } from 'react'

export function useFileTree(
  githubToken: string | null,
  repository: Repository | null
) {
  const setLocalFileTree = useFileTreeStore((state) => state.setLocalFileTree)
  const resetFileTree = useFileTreeStore((state) => state.resetFileTree)

  const query = useQuery({
    queryKey: ['fileTree', repository?.full_name],
    queryFn: async () => {
      if (!githubToken || !repository) {
        return []
      }
      const client = new GitHubClient(githubToken)
      const [owner, repo] = repository.full_name.split('/')
      return client.getRepositoryTree(owner, repo)
    },
    enabled: !!githubToken && !!repository,
    staleTime: 5 * 60 * 1000, // 5分
  })

  // TanStack Queryで取得したデータをZustandストアに同期
  useEffect(() => {
    if (query.data) {
      setLocalFileTree(query.data)
    }
  }, [query.data, setLocalFileTree])

  // リポジトリ変更時にストアをリセットし、ルートノードを展開
  useEffect(() => {
    resetFileTree()
    // ルートノード（空文字列）を展開状態にする
    if (repository) {
      useFileTreeStore.setState(() => ({
        expandedDirs: new Set([''])
      }))
    }
  }, [repository?.full_name, resetFileTree, repository])

  return query
}
