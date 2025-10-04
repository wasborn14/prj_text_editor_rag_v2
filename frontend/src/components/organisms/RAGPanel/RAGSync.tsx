'use client'

import React, { useState } from 'react'
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useRAGSync } from '@/hooks/useRAGSync'

interface RAGSyncProps {
  repository?: string
}

export const RAGSync = ({ repository = 'wasborn14/test-editor-docs' }: RAGSyncProps) => {
  const [syncResult, setSyncResult] = useState<string>('')
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { syncRepository, isSyncing, error } = useRAGSync()

  const handleSync = async () => {
    setSyncResult('')
    setSyncStatus('idle')

    const result = await syncRepository(repository)

    if (result) {
      setSyncResult(`${result.status}: ${result.message} (${result.files_synced} files synced)`)
      setSyncStatus('success')
    } else if (error) {
      setSyncResult(error)
      setSyncStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="space-y-4">
        {/* Repository Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Current Repository</div>
          <div className="font-mono font-semibold text-gray-900">{repository}</div>
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
