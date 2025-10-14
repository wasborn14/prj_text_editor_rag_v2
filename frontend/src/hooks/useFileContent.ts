import { useQuery } from '@tanstack/react-query'
import { GitHubClient } from '@/lib/github'

interface UseFileContentParams {
  owner: string
  repo: string
  path: string
  enabled?: boolean
  githubToken: string | null
}

export function useFileContent({
  owner,
  repo,
  path,
  enabled = true,
  githubToken,
}: UseFileContentParams) {
  return useQuery({
    queryKey: ['fileContent', owner, repo, path],
    queryFn: async () => {
      if (!githubToken) {
        throw new Error('GitHub token is required')
      }
      const client = new GitHubClient(githubToken)
      return await client.getFileContent(owner, repo, path)
    },
    enabled: enabled && !!githubToken && !!path,
    staleTime: 1000 * 60 * 5, // 5分間はキャッシュを使用
    retry: 1,
  })
}
