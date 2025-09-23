import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { GitHubRepository, UserRepository } from '@/types'

interface CreateRepositoryPayload {
  github_repo_id: number
  owner: string
  name: string
  full_name: string
  description?: string | null
  default_branch?: string
  language?: string | null
}

interface SelectRepositoryPayload {
  repository_id: string
}

// リポジトリをデータベースに作成
async function createRepository(payload: CreateRepositoryPayload): Promise<UserRepository> {
  const response = await fetch('/api/repositories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to create repository')
  }

  const result = await response.json()
  return result.data
}

// リポジトリを選択
async function selectRepository(payload: SelectRepositoryPayload): Promise<void> {
  const response = await fetch('/api/repositories/select', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to select repository')
  }
}

// リポジトリ作成のMutation Hook
export function useCreateRepository() {
  return useMutation({
    mutationFn: createRepository,
    mutationKey: ['create-repository'],
  })
}

// リポジトリ選択のMutation Hook
export function useSelectRepository() {
  return useMutation({
    mutationFn: selectRepository,
    mutationKey: ['select-repository'],
  })
}

// 複合的なリポジトリ作成＆選択のHook
export function useCreateAndSelectRepository() {
  const router = useRouter()
  const setSelectedRepository = useAuthStore((state) => state.setSelectedRepository)
  const setRepositorySetupCompleted = useAuthStore((state) => state.setRepositorySetupCompleted)

  return useMutation({
    mutationKey: ['create-and-select-repository'],
    mutationFn: async (githubRepo: GitHubRepository) => {
      // Step 1: Create repository in database
      const createPayload: CreateRepositoryPayload = {
        github_repo_id: githubRepo.id,
        owner: githubRepo.owner,
        name: githubRepo.name,
        full_name: githubRepo.fullName,
        description: githubRepo.description,
        default_branch: githubRepo.defaultBranch,
        language: githubRepo.language,
      }

      const createdRepo = await createRepository(createPayload)

      // Step 2: Select the created repository
      await selectRepository({ repository_id: createdRepo.id })

      return createdRepo
    },
    onSuccess: (createdRepo) => {
      // Update global state
      setSelectedRepository(createdRepo)
      setRepositorySetupCompleted(true)

      // Navigate to workspace
      router.push('/workspace')
    },
    onError: (error) => {
      console.error('Repository creation/selection failed:', error)
    },
  })
}