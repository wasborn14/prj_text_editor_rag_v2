import { useEffect } from 'react'
import type { Editor } from '@tiptap/core'
import { useSaveFile } from './useSaveFile'
import { useAuthStore } from '@/stores/authStore'

/**
 * エディタの保存イベントを管理するカスタムフック
 */
export function useEditorSave(
  editorInstance: Editor | null,
  owner: string | null,
  repo: string | null
) {
  const { saveFile, isSaving } = useSaveFile()
  const githubToken = useAuthStore((state) => state.githubToken)

  useEffect(() => {
    const handleSave = async () => {
      if (!editorInstance || !owner || !repo || !githubToken || isSaving) return

      const content = editorInstance.getJSON()
      await saveFile(content, owner, repo)
    }

    window.addEventListener('editor:save', handleSave)
    return () => window.removeEventListener('editor:save', handleSave)
  }, [editorInstance, owner, repo, githubToken, saveFile, isSaving])
}
