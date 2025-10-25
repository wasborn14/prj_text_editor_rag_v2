import { useEffect, useRef } from 'react'
import { useEditorState } from './useEditorState'
import { useFileTreeStore } from '@/stores/fileTreeStore'
import type { Repository } from '@/lib/github'

/**
 * リポジトリ選択時にエディタ状態を復元するカスタムフック
 *
 * @param selectedRepo - 選択されたリポジトリ
 * @param fileTreeLoaded - ファイルツリーのロード完了フラグ
 */
export function useRestoreEditorState(
  selectedRepo: Repository | null,
  fileTreeLoaded: boolean
) {
  const { restoreEditorState } = useEditorState()
  const { setExpandedDirs } = useFileTreeStore()
  const lastRestoredRepoRef = useRef<string | null>(null)

  useEffect(() => {
    const repoKey = selectedRepo?.full_name ?? null

    // 復元条件チェック
    if (!selectedRepo || !fileTreeLoaded || lastRestoredRepoRef.current === repoKey) {
      return
    }

    // エディタ状態を復元
    const restored = restoreEditorState()
    if (restored.length > 0) {
      setExpandedDirs(() => new Set(restored))
    }

    // 復元済みとしてマーク
    lastRestoredRepoRef.current = repoKey
  }, [selectedRepo, fileTreeLoaded, restoreEditorState, setExpandedDirs])
}
