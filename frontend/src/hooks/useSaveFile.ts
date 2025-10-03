'use client'

import { useState } from 'react'
import { useEditorStore } from '@/stores/editorStore'

interface SaveFileParams {
  repositoryId: string
  owner: string
  name: string
  filePath: string
  content: string
  message?: string
  sha?: string
}

interface SaveFileResponse {
  success: boolean
  sha?: string
  message: string
  error?: string
}

export const useSaveFile = () => {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setSaving, markSaved, updateSha } = useEditorStore()

  const saveFile = async (params: SaveFileParams): Promise<SaveFileResponse | null> => {
    const { repositoryId, owner, name, filePath, content, message, sha } = params

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch('/api/github/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repositoryId,
          owner,
          name,
          filePath,
          content,
          message,
          sha,
        }),
      })

      const result: SaveFileResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save file')
      }

      return result

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Save file error:', err)
      return null

    } finally {
      setIsSaving(false)
    }
  }

  const saveActiveTab = async (repositoryId: string, owner: string, name: string, customMessage?: string): Promise<boolean> => {
    const { getActiveTab } = useEditorStore.getState()
    const activeTab = getActiveTab()

    if (!activeTab) {
      setError('No active tab to save')
      return false
    }

    // タブの保存状態を更新
    setSaving(activeTab.id, true)

    try {
      const result = await saveFile({
        repositoryId,
        owner,
        name,
        filePath: activeTab.path,
        content: activeTab.content,
        message: customMessage || `Update ${activeTab.name}`,
        sha: activeTab.sha,
      })

      if (result?.success) {
        // 保存成功時は新しいshaを更新してタブをクリーンな状態にする
        if (result.sha) {
          updateSha(activeTab.id, result.sha)
        }
        markSaved(activeTab.id)
        return true
      } else {
        return false
      }

    } finally {
      setSaving(activeTab.id, false)
    }
  }

  return {
    saveFile,
    saveActiveTab,
    isSaving,
    error,
    clearError: () => setError(null),
  }
}