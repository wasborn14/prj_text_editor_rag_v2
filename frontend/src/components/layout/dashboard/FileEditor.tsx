'use client'

import React, { useMemo } from 'react'
import { EditorRoot, EditorContent } from 'novel'
import StarterKit from '@tiptap/starter-kit'
import { useEditorStore } from '@/stores/editorStore'
import { useAuthStore } from '@/stores/authStore'
import { useFileContent } from '@/hooks/useFileContent'
import { Loader2 } from 'lucide-react'
import type { JSONContent } from 'novel'
import '@/styles/novel.css'

// Markdownテキストを段落に分割してJSONContentに変換
function convertTextToContent(text: string): JSONContent {
  const lines = text.split('\n')
  const content: JSONContent[] = lines.map((line) => ({
    type: 'paragraph',
    content: line ? [{ type: 'text', text: line }] : undefined,
  }))

  return {
    type: 'doc',
    content,
  }
}

interface FileEditorProps {
  owner: string | null
  repo: string | null
}

export function FileEditor({ owner, repo }: FileEditorProps) {
  const { selectedFilePath } = useEditorStore()
  const githubToken = useAuthStore((state) => state.githubToken)

  // TanStack Queryでファイル内容を取得
  const { data: fileData, isLoading } = useFileContent({
    owner: owner || '',
    repo: repo || '',
    path: selectedFilePath || '',
    enabled: !!owner && !!repo && !!selectedFilePath,
    githubToken,
  })

  const editorContent = useMemo(() => {
    if (!fileData?.content) return null
    return convertTextToContent(fileData.content)
  }, [fileData?.content])

  return (
    <div className="flex-1 h-full overflow-auto bg-white dark:bg-gray-900">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : editorContent ? (
        <div key={selectedFilePath}>
          <EditorRoot>
            <EditorContent
              extensions={[StarterKit]}
              initialContent={editorContent}
              className="min-h-full p-4 md:p-8 max-w-none md:max-w-4xl md:mx-auto"
              immediatelyRender={false}
            />
          </EditorRoot>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-400">
          ドキュメントを選択してください。
        </div>
      )}
    </div>
  )
}
