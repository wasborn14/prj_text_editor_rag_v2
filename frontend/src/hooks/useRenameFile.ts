import { useState } from 'react'

interface RenameFileParams {
  owner: string
  repo: string
  oldPath: string
  newPath: string
  type: 'file' | 'dir'
  message?: string
}

interface RenameFileResult {
  success: boolean
  oldPath: string
  newPath: string
  type: 'file' | 'dir'
  renamedFiles?: number
  sha?: string
  error?: string
}

export function useRenameFile() {
  const [isRenaming, setIsRenaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const renameFile = async (
    params: RenameFileParams
  ): Promise<RenameFileResult | null> => {
    setIsRenaming(true)
    setError(null)

    try {
      const response = await fetch('/api/github/rename-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to rename file/folder'
        setError(errorMessage)
        throw new Error(errorMessage)
      }

      return data
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error renaming file/folder:', err)
      return null
    } finally {
      setIsRenaming(false)
    }
  }

  return {
    renameFile,
    isRenaming,
    error
  }
}
