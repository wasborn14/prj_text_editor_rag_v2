import { useState } from 'react'

interface DeleteFileParams {
  owner: string
  repo: string
  path: string
  type: 'file' | 'dir'
  message?: string
}

interface DeleteFileResult {
  success: boolean
  path: string
  type: 'file' | 'dir'
  deletedFiles?: number
  error?: string
}

export function useDeleteFile() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteFile = async (
    params: DeleteFileParams
  ): Promise<DeleteFileResult | null> => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch('/api/github/delete-file', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to delete file/folder'
        setError(errorMessage)
        throw new Error(errorMessage)
      }

      return data
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error deleting file/folder:', err)
      return null
    } finally {
      setIsDeleting(false)
    }
  }

  return {
    deleteFile,
    isDeleting,
    error
  }
}
