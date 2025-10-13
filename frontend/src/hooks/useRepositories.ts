import { useQuery } from '@tanstack/react-query'
import { GitHubClient } from '@/lib/github'

export function useRepositories(githubToken: string | null) {
  return useQuery({
    queryKey: ['repositories', githubToken],
    queryFn: async () => {
      if (!githubToken) {
        throw new Error('GitHubトークンが取得できませんでした')
      }
      const client = new GitHubClient(githubToken)
      return client.getRepositories()
    },
    enabled: !!githubToken,
    staleTime: 5 * 60 * 1000, // 5分
  })
}
