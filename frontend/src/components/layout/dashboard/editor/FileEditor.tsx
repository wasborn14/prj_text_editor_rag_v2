'use client'

import React, { useMemo, useState } from 'react'
import { EditorRoot, EditorContent } from 'novel'
import { useEditorStore } from '@/stores/editorStore'
import { useAuthStore } from '@/stores/authStore'
import { useFileContent } from '@/hooks/useFileContent'
import { useFileShaSync } from '@/hooks/useFileShaSync'
import { useEditorSave } from '@/hooks/useEditorSave'
import { useUnsavedWarning } from '@/hooks/useUnsavedWarning'
import { Loader2 } from 'lucide-react'
import { convertMarkdownToContent } from '@/lib/editor/markdownConverter'
import { getEditorExtensions } from '@/lib/editor/editorExtensions'
import { EditorContentWrapper } from './EditorContentWrapper'
import type { Editor } from '@tiptap/core'
import '@/styles/editor.css'
import '@/styles/novel.css'
import '@/styles/syntax-highlight.css'

interface FileEditorProps {
  owner: string | null
  repo: string | null
}

export function FileEditor({ owner, repo }: FileEditorProps) {
  const { selectedFilePath, isModified, setIsModified } = useEditorStore()
  const githubToken = useAuthStore((state) => state.githubToken)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [showTableToolbar, setShowTableToolbar] = useState(false)
  const [tableToolbarPosition, setTableToolbarPosition] = useState({ top: 0, left: 0 })
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)

  // TanStack Queryでファイル内容を取得
  const { data: fileData, isLoading } = useFileContent({
    owner: owner || '',
    repo: repo || '',
    path: selectedFilePath || '',
    enabled: !!owner && !!repo && !!selectedFilePath,
    githubToken,
  })

  // カスタムフックで各機能を管理
  useFileShaSync(fileData?.sha)
  useEditorSave(editorInstance, owner, repo)
  useUnsavedWarning(isModified)

  const editorContent = useMemo(() => {
    if (!fileData?.content) return null
    return convertMarkdownToContent(fileData.content)
  }, [fileData?.content])

  // エディタの変更を検知
  const handleUpdate = () => {
    setIsModified(true)
  }

  // エディタインスタンスを取得
  const handleCreate = ({ editor }: { editor: Editor }) => {
    setEditorInstance(editor)
  }

  return (
    <div className="flex-1 h-full overflow-auto bg-white dark:bg-black relative">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : editorContent ? (
        <div key={selectedFilePath} className="w-full h-full">
          <EditorRoot>
            <EditorContent
              extensions={getEditorExtensions()}
              initialContent={editorContent}
              className="min-h-full p-4 md:p-8 prose prose-lg max-w-none md:max-w-6xl md:mx-auto"
              immediatelyRender={false}
              onUpdate={handleUpdate}
              onCreate={handleCreate}
            >
              <EditorContentWrapper
                showMenu={showMenu}
                setShowMenu={setShowMenu}
                menuPosition={menuPosition}
                setMenuPosition={setMenuPosition}
                showTableToolbar={showTableToolbar}
                setShowTableToolbar={setShowTableToolbar}
                tableToolbarPosition={tableToolbarPosition}
                setTableToolbarPosition={setTableToolbarPosition}
              />
            </EditorContent>
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
