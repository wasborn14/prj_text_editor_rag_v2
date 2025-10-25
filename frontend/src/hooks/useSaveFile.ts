import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useEditorStore } from '@/stores/editorStore'
import { useAuthStore } from '@/stores/authStore'
import { convertContentToMarkdown } from '@/lib/editor/markdownConverter'
import type { JSONContent } from 'novel'

export function useSaveFile() {
  const [isSaving, setIsSaving] = useState(false)
  const queryClient = useQueryClient()
  const { selectedFilePath, currentFileSha, setIsModified, setCurrentFileSha } =
    useEditorStore()
  const githubToken = useAuthStore((state) => state.githubToken)

  const saveFile = async (
    content: JSONContent,
    owner: string,
    repo: string
  ): Promise<boolean> => {
    if (!selectedFilePath || !currentFileSha || isSaving) {
      return false
    }

    setIsSaving(true)
    try {
      // 1. JSON → Markdown変換
      const markdown = convertContentToMarkdown(content)

      // 2. API呼び出し
      const response = await fetch('/api/github/update-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${githubToken}`,
        },
        body: JSON.stringify({
          owner,
          repo,
          path: selectedFilePath,
          content: markdown,
          sha: currentFileSha,
          message: `Update ${selectedFilePath}`,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 3. 成功処理
        setCurrentFileSha(data.sha)
        setIsModified(false)

        // 4. キャッシュを無効化して最新データを取得
        // ファイルコンテンツのキャッシュを無効化
        queryClient.invalidateQueries({
          queryKey: ['fileContent', owner, repo, selectedFilePath],
        })

        // ファイルツリーのキャッシュも無効化（SHAを最新に）
        queryClient.invalidateQueries({
          queryKey: ['fileTree', `${owner}/${repo}`],
        })

        return true
      } else {
        throw new Error(data.error || 'Failed to save file')
      }
    } catch {
      return false
    } finally {
      setIsSaving(false)
    }
  }

  return { saveFile, isSaving }
}
