import { useState } from 'react'

interface CreateFileParams {
  owner: string
  repo: string
  path: string
  content?: string
  message?: string
  type: 'file' | 'folder'
}

interface CreateFileResult {
  success: boolean
  path: string
  sha?: string
  type: 'file' | 'folder'
  error?: string
}

export function useCreateFile() {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createFile = async (
    params: CreateFileParams
  ): Promise<CreateFileResult | null> => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/github/create-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to create file/folder'
        setError(errorMessage)
        throw new Error(errorMessage)
      }

      return data
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error creating file/folder:', err)
      return null
    } finally {
      setIsCreating(false)
    }
  }

  return {
    createFile,
    isCreating,
    error
  }
}
