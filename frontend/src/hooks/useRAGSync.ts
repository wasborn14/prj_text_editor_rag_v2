import { useState } from 'react'
import { SyncResponse } from '@/types/rag'

export const useRAGSync = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncRepository = async (
    repository: string,
    force = false
  ): Promise<SyncResponse | null> => {
    setIsSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/rag/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repository, force })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sync failed')
      }

      const data: SyncResponse = await response.json()

      if (data.error || data.status === 'error') {
        throw new Error(data.error || data.message)
      }

      return data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return null
    } finally {
      setIsSyncing(false)
    }
  }

  return { syncRepository, isSyncing, error }
}
