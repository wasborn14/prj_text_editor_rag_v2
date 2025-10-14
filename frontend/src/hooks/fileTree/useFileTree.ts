import { useQuery } from '@tanstack/react-query'
import { GitHubClient, Repository } from '@/lib/github'

export function useFileTree(
  githubToken: string | null,
  repository: Repository | null
) {
  return useQuery({
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
}
