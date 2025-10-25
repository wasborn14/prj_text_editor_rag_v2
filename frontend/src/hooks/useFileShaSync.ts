import { useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'

/**
 * ファイルデータのSHAを同期し、変更状態をリセットするカスタムフック
 */
export function useFileShaSync(sha: string | undefined) {
  const { setCurrentFileSha, setIsModified } = useEditorStore()

  useEffect(() => {
    if (!sha) return

    setCurrentFileSha(sha)
    setIsModified(false)
  }, [sha, setCurrentFileSha, setIsModified])
}
