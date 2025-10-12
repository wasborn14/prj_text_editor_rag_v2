import { useState } from 'react'
import { SyncResponse } from '@/types/rag'

interface JobStatus {
  status: 'processing' | 'completed' | 'error' | 'not_found'
  repository?: string
  files_synced?: number
  message?: string
  error?: string
  started_at?: number
  completed_at?: number
}

export const useRAGSync = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pollJobStatus = async (jobId: string, maxAttempts = 60): Promise<JobStatus | null> => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 3000)) // 3秒ごと

      try {
        const response = await fetch(`/api/rag/sync/status/${jobId}`)

        if (!response.ok) {
          continue
        }

        const status: JobStatus = await response.json()

        if (status.status === 'completed') {
          return status
        }

        if (status.status === 'error') {
          throw new Error(status.error || 'Sync failed')
        }

        if (status.status === 'not_found') {
          throw new Error('Job not found or expired')
        }

        // まだprocessing中、次のループへ
      } catch (err) {
        if (i === maxAttempts - 1) {
          throw err
        }
      }
    }

    throw new Error('Sync timeout - took longer than expected')
  }

  const syncRepository = async (
    repository: string,
    force = false
  ): Promise<SyncResponse | null> => {
    setIsSyncing(true)
    setError(null)

    try {
      // 1. 同期開始リクエスト（job_idを取得）
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

      const data = await response.json()

      if (data.error || data.status === 'error') {
        throw new Error(data.error || data.message)
      }

      // job_idが返ってきた場合はポーリング
      if (data.job_id) {
        const result = await pollJobStatus(data.job_id)

        if (!result) {
          throw new Error('Failed to get sync result')
        }

        return {
          status: result.status === 'completed' ? 'success' : 'error',
          repository: result.repository || repository,
          files_synced: result.files_synced || 0,
          message: result.message || '',
          error: result.error
        }
      }

      // 古いAPIレスポンス形式（互換性のため）
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
