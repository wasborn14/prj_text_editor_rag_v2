'use client'

import React, { useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import { useRAGSync } from '@/hooks/rag/useRAGSync'
import { createClient } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatRelativeTime } from '@/utils/time'

interface RAGSyncProps {
  repository?: string
}

interface SyncStatus {
  last_synced_at: string
  last_sync_status: string
  files_count: number
}

export const RAGSync = ({ repository }: RAGSyncProps) => {
  const [syncResult, setSyncResult] = useState<string>('')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { syncRepository, isSyncing, error } = useRAGSync()
  const user = useAuthStore((state) => state.user)
  const supabase = createClient()
  const queryClient = useQueryClient()

  // 最終同期情報を取得（React Query）
  const { data: lastSyncInfo } = useQuery({
    queryKey: ['repository-sync-status', repository],
    queryFn: async () => {
      if (!repository) return null

      const { data } = await supabase
        .from('repository_sync_status')
        .select('last_synced_at, last_sync_status, files_count')
        .eq('repository', repository)
        .maybeSingle()

      return data as SyncStatus | null
    },
    enabled: !!repository
  })

  const handleSync = async () => {
    if (!repository) {
      setSyncResult('No repository selected')
      setSyncStatus('error')
      return
    }

    setSyncResult('')
    setSyncStatus('idle')

    const result = await syncRepository(repository)

    if (result && result.status === 'success') {
      setSyncResult(`${result.status}: ${result.message} (${result.files_synced} files synced)`)
      setSyncStatus('success')

      // Supabaseに履歴保存
      if (user) {
        await supabase.from('repository_sync_status').upsert({
          repository,
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'success',
          files_count: result.files_synced,
          updated_by: user.id
        })

        // React Queryキャッシュを無効化して再取得
        queryClient.invalidateQueries({ queryKey: ['repository-sync-status', repository] })
      }
    } else if (error || result?.status === 'error') {
      const errorMsg = error || result?.message || 'Sync failed'
      setSyncResult(errorMsg)
      setSyncStatus('error')

      // エラーもSupabaseに保存
      if (user) {
        await supabase.from('repository_sync_status').upsert({
          repository,
          last_synced_at: new Date().toISOString(),
          last_sync_status: 'error',
          files_count: 0,
          error_message: errorMsg,
          updated_by: user.id
        })

        // React Queryキャッシュを無効化して再取得
        queryClient.invalidateQueries({ queryKey: ['repository-sync-status', repository] })
      }
    }
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="space-y-4">
        {/* Repository Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Current Repository</div>
          <div className="font-mono font-semibold text-gray-900">{repository}</div>

          {/* Last Sync Info */}
          {lastSyncInfo && (
            <div className="mt-3 pt-3 border-t border-gray-300 flex items-center space-x-2 text-xs">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-600">
                Last synced: <span className="font-medium">{formatRelativeTime(lastSyncInfo.last_synced_at)}</span>
                {lastSyncInfo.last_sync_status === 'success' && (
                  <span className="text-green-600 ml-1">({lastSyncInfo.files_count} files)</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing || !repository}
          className="w-full bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white px-4 py-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Repository'}</span>
        </button>

        {/* Sync Result */}
        {syncResult && (
          <div
            className={`p-4 rounded-lg border flex items-start space-x-3 ${
              syncStatus === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : syncStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-gray-50 border-gray-200 text-gray-800'
            }`}
          >
            {syncStatus === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            {syncStatus === 'error' && <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
            <div className="text-sm">{syncResult}</div>
          </div>
        )}

        {/* Error Display */}
        {error && !syncResult && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <div className="font-semibold mb-2">About Sync</div>
          <ul className="space-y-1 text-xs">
            <li>• Syncs repository files to RAG database</li>
            <li>• Updates semantic search index</li>
            <li>• Required before first search</li>
            <li>• Re-sync after repository updates</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
