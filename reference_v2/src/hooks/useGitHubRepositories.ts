import { useQuery } from '@tanstack/react-query'
import { GitHubRepository } from '@/types'

interface GitHubRepositoriesParams {
  sort?: 'updated' | 'created' | 'full_name'
  perPage?: number
  type?: 'all' | 'owner' | 'member'
}

async function fetchGitHubRepositories(
  params: GitHubRepositoriesParams = {}
): Promise<GitHubRepository[]> {
  const queryParams = new URLSearchParams({
    sort: params.sort || 'updated',
    per_page: String(params.perPage || 50),
    type: params.type || 'all',
  })

  const response = await fetch(`/api/github/repositories?${queryParams}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to fetch GitHub repositories')
  }

  const result = await response.json()
  return result.data || []
}

export function useGitHubRepositories(params: GitHubRepositoriesParams = {}) {
  return useQuery({
    queryKey: ['github-repositories', params],
    queryFn: () => fetchGitHubRepositories(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })
}