'use client';

import { RefreshCwIcon } from 'lucide-react';

interface AutoSyncStatusProps {
  isSyncing: boolean;
  statusText: string;
  statusColor: string;
  onManualSync: () => void;
}

export default function AutoSyncStatus({
  isSyncing,
  statusText,
  statusColor,
  onManualSync,
}: AutoSyncStatusProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-gray-50 border-gray-200">
      {/* 同期アイコン */}
      <RefreshCwIcon
        className={`w-4 h-4 ${statusColor} ${isSyncing ? 'animate-spin' : ''}`}
      />

      {/* ステータステキスト */}
      <span className={`text-sm ${statusColor}`}>
        {statusText}
      </span>

      {/* 手動同期ボタン */}
      <button
        onClick={onManualSync}
        disabled={isSyncing}
        className={`
          ml-2 px-2 py-0.5 text-xs rounded border
          ${isSyncing
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
          }
        `}
        title="手動で同期を実行"
      >
        {isSyncing ? '同期中...' : '同期'}
      </button>
    </div>
  );
}