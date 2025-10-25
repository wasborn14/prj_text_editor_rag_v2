import { useCallback, useRef } from 'react'
import { useSelectedRepository } from './useSelectedRepository'
import { useEditorStore } from '@/stores/editorStore'

/**
 * エディタ状態（最後に開いたファイル、フォルダ開閉状態）を永続化するフック
 */
export function useEditorState() {
  const { selectedRepository, saveSelectedRepository } = useSelectedRepository()
  const { setSelectedFile } = useEditorStore()
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // リポジトリの基本情報を取得するヘルパー
  const getRepositoryBase = useCallback(() => {
    if (!selectedRepository) return null

    return {
      repository_id: selectedRepository.repository_id,
      repository_full_name: selectedRepository.repository_full_name,
      repository_name: selectedRepository.repository_name,
      repository_owner: selectedRepository.repository_owner,
    }
  }, [selectedRepository])

  // ファイルパスを保存（即座に実行）
  const saveLastOpenedFile = useCallback(
    async (filePath: string | null) => {
      const base = getRepositoryBase()
      if (!base || !selectedRepository) return

      await saveSelectedRepository({
        ...base,
        last_opened_file_path: filePath,
        expanded_folders: selectedRepository.expanded_folders ?? [],
      })
    },
    [getRepositoryBase, selectedRepository, saveSelectedRepository]
  )

  // フォルダ開閉状態を保存（デバウンス500ms）
  const saveExpandedFolders = useCallback(
    (folders: string[]) => {
      const base = getRepositoryBase()
      if (!base || !selectedRepository) return

      // 既存のタイマーをクリア
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // 新しいタイマーを設定
      debounceTimerRef.current = setTimeout(async () => {
        await saveSelectedRepository({
          ...base,
          last_opened_file_path: selectedRepository.last_opened_file_path,
          expanded_folders: folders,
        })
      }, 500)
    },
    [getRepositoryBase, selectedRepository, saveSelectedRepository]
  )

  // 状態を復元
  const restoreEditorState = useCallback(() => {
    if (!selectedRepository) return []

    // 最後に開いたファイルを復元
    if (selectedRepository.last_opened_file_path) {
      setSelectedFile(selectedRepository.last_opened_file_path)
    }

    // フォルダ開閉状態を返す（nullの場合は空配列）
    return selectedRepository.expanded_folders ?? []
  }, [selectedRepository, setSelectedFile])

  return {
    saveLastOpenedFile,
    saveExpandedFolders,
    restoreEditorState,
  }
}
