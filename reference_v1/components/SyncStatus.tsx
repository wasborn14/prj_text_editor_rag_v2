'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export type SyncState = 'synced' | 'syncing' | 'conflict' | 'error' | 'pending';

interface SyncStatusProps {
  repositoryId?: string;
  fileId?: string;
  // 自動同期用のプロパティ
  isSyncing?: boolean;
  statusText?: string;
  statusColor?: string;
  onManualSync?: () => void;
}

export default function SyncStatus({
  repositoryId,
  fileId,
  isSyncing = false,
  statusText,
  statusColor = 'text-gray-500',
  onManualSync
}: SyncStatusProps) {
  const [state, setState] = useState<SyncState>('synced');
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 同期状態の設定
  const statusConfig = {
    synced: {
      icon: '✅',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      text: 'Synced',
      description: 'All changes are synchronized',
      animate: false,
    },
    syncing: {
      icon: '🔄',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      text: 'Syncing...',
      description: 'Synchronizing with GitHub',
      animate: true,
    },
    conflict: {
      icon: '⚠️',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      text: 'Conflict',
      description: 'Conflicts need resolution',
      animate: false,
    },
    error: {
      icon: '❌',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      text: 'Sync Error',
      description: errorMessage || 'Failed to synchronize',
      animate: false,
    },
    pending: {
      icon: '⏳',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      text: 'Pending',
      description: `${pendingChanges} change${pendingChanges !== 1 ? 's' : ''} pending`,
      animate: false,
    },
  };

  const config = statusConfig[state];

  // リアルタイム同期状態の監視
  useEffect(() => {
    if (!repositoryId) return;

    const supabase = createClient();

    // 同期状態テーブルを監視（将来実装）
    const channel = supabase
      .channel(`sync-status-${repositoryId}`)
      .on('broadcast', { event: 'sync-update' }, (payload) => {
        console.log('Sync update received:', payload);

        // 同期状態を更新
        if (payload.state) {
          setState(payload.state as SyncState);
        }
        if (payload.lastSync) {
          setLastSync(new Date(payload.lastSync));
        }
        if (payload.pendingChanges !== undefined) {
          setPendingChanges(payload.pendingChanges);
        }
        if (payload.error) {
          setErrorMessage(payload.error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [repositoryId]);

  // 最終同期時刻のフォーマット
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${config.bgColor} ${config.borderColor}`}>
      {/* アイコン */}
      <span className={`text-lg ${config.animate ? 'animate-spin' : ''}`}>
        {config.icon}
      </span>

      {/* 状態テキスト */}
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${config.color}`}>
          {config.text}
        </span>

        {/* 詳細情報 */}
        <span className="text-xs text-gray-500">
          {state === 'synced' && lastSync
            ? `Last sync: ${formatLastSync(lastSync)}`
            : config.description}
        </span>
      </div>

      {/* 追加情報 */}
      {pendingChanges > 0 && state !== 'pending' && (
        <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
          {pendingChanges} pending
        </span>
      )}

      {/* 再同期ボタン（エラー時） */}
      {state === 'error' && (
        <button
          onClick={() => {
            setState('syncing');
            // TODO: 再同期処理を実装
          }}
          className="ml-2 px-2 py-0.5 text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded"
        >
          Retry
        </button>
      )}
    </div>
  );
}