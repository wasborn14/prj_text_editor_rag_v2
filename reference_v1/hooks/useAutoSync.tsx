import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface AutoSyncOptions {
  enabled?: boolean;
  intervalMs?: number; // デフォルト: 5分
  onSyncStart?: () => void;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
}

interface SyncResult {
  filesUpdated: number;
  filesAdded: number;
  filesDeleted: number;
  timestamp: Date;
}

export function useAutoSync(
  repositoryId: string | null,
  options: AutoSyncOptions = {}
) {
  const {
    enabled = true,
    intervalMs = 5 * 60 * 1000, // 5分
    onSyncStart,
    onSyncComplete,
    onSyncError,
  } = options;

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'success'>('idle');
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const queryClient = useQueryClient();

  // 同期実行関数
  const performSync = async () => {
    if (!repositoryId || isSyncing) {
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    onSyncStart?.();

    try {
      // GitHubから最新の状態を同期
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId,
          checkOnly: false, // 実際に同期を実行
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();

      // 同期結果の処理
      const syncResult: SyncResult = {
        filesUpdated: result.filesUpdated || 0,
        filesAdded: result.filesAdded || 0,
        filesDeleted: result.filesDeleted || 0,
        timestamp: new Date(),
      };

      // ファイルが更新された場合、キャッシュをリフレッシュ
      if (syncResult.filesUpdated > 0 || syncResult.filesAdded > 0 || syncResult.filesDeleted > 0) {
        // ファイル一覧のキャッシュを無効化
        queryClient.invalidateQueries({ queryKey: ['files', repositoryId] });

        // 通知を表示（console.logで代替）
        console.log(
          `同期完了: ${syncResult.filesUpdated}件更新, ${syncResult.filesAdded}件追加, ${syncResult.filesDeleted}件削除`
        );
      }

      setLastSyncTime(syncResult.timestamp);
      setSyncStatus('success');
      onSyncComplete?.(syncResult);

    } catch (error) {
      setSyncStatus('error');
      const errorMessage = error instanceof Error ? error.message : '同期エラーが発生しました';

      // エラー通知（console.errorで代替）
      console.error(`同期エラー: ${errorMessage}`);
      onSyncError?.(error instanceof Error ? error : new Error(errorMessage));

      console.error('Auto sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // 手動同期トリガー
  const triggerSync = () => {
    if (!isSyncing && repositoryId) {
      performSync();
    }
  };

  // 同期チェック（変更があるかどうかを確認）
  const checkForChanges = async (): Promise<boolean> => {
    if (!repositoryId) {
      return false;
    }

    try {
      const response = await fetch('/api/github/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId,
          checkOnly: true, // 変更チェックのみ
        }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.hasChanges || false;

    } catch (error) {
      console.error('Error checking for changes:', error);
      return false;
    }
  };

  // 定期同期のセットアップ
  useEffect(() => {
    if (!enabled || !repositoryId) {
      // クリーンアップ
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      return;
    }

    // 初回同期（マウント時）
    performSync();

    // 定期同期の設定
    intervalRef.current = setInterval(() => {
      performSync();
    }, intervalMs);

    // ページがフォーカスを取り戻した時にも同期
    const handleFocus = () => {
      // 最後の同期から1分以上経過していたら同期
      if (!lastSyncTime || Date.now() - lastSyncTime.getTime() > 60000) {
        performSync();
      }
    };

    window.addEventListener('focus', handleFocus);

    // クリーンアップ
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, repositoryId, intervalMs]);

  return {
    isSyncing,
    lastSyncTime,
    syncStatus,
    triggerSync,
    checkForChanges,
  };
}

// 同期状態を表示するコンポーネント用のヘルパーフック
export function useSyncIndicator(repositoryId: string | null) {
  const { isSyncing, lastSyncTime, syncStatus } = useAutoSync(repositoryId, {
    enabled: !!repositoryId,
  });

  const getStatusText = () => {
    if (isSyncing) return '同期中...';
    if (!lastSyncTime) return '未同期';

    const now = Date.now();
    const timeDiff = now - lastSyncTime.getTime();
    const minutes = Math.floor(timeDiff / 60000);

    if (minutes < 1) return '同期済み';
    if (minutes < 60) return `${minutes}分前に同期`;

    const hours = Math.floor(minutes / 60);
    return `${hours}時間前に同期`;
  };

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'syncing': return 'text-blue-500';
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return {
    statusText: getStatusText(),
    statusColor: getStatusColor(),
    isSyncing,
  };
}