'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { EditorRoot, EditorContent, useEditor } from 'novel'
import { useEditorStore } from '@/stores/editorStore'
import { useAuthStore } from '@/stores/authStore'
import { useFileContent } from '@/hooks/useFileContent'
import { Loader2 } from 'lucide-react'
import type { NovelEditor } from '@/types/prosemirror'
import { convertMarkdownToContent } from '@/lib/editor/markdownConverter'
import { DUMMY_MARKDOWN } from '@/constants/dummyMarkdown'
import { getEditorExtensions } from '@/lib/editor/editorExtensions'
import '@/styles/novel.css'
import '@/styles/syntax-highlight.css'
interface FileEditorProps {
  owner: string | null
  repo: string | null
}

interface SlashCommand {
  id: string
  label: string
  icon: string
  action: (editor: NovelEditor) => void
}

// スラッシュコマンドの定義
const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'h1',
    label: 'Heading 1',
    icon: 'H1',
    action: (editor) => editor.chain().focus().setHeading({ level: 1 }).run()
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: 'H2',
    action: (editor) => editor.chain().focus().setHeading({ level: 2 }).run()
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: 'H3',
    action: (editor) => editor.chain().focus().setHeading({ level: 3 }).run()
  },
  {
    id: 'paragraph',
    label: 'Text',
    icon: '¶',
    action: (editor) => editor.chain().focus().setParagraph().run()
  },
  {
    id: 'bullet',
    label: 'Bullet List',
    icon: '•',
    action: (editor) => editor.chain().focus().toggleBulletList().run()
  },
  {
    id: 'number',
    label: 'Numbered List',
    icon: '1.',
    action: (editor) => editor.chain().focus().toggleOrderedList().run()
  },
  {
    id: 'quote',
    label: 'Quote',
    icon: '"',
    action: (editor) => editor.chain().focus().toggleBlockquote().run()
  },
  {
    id: 'code',
    label: 'Code Block',
    icon: '</>',
    action: (editor) => editor.chain().focus().setCodeBlock().run()
  },
  {
    id: 'table',
    label: 'Table',
    icon: '⊞',
    action: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }
]

const executeSlashCommand = (editor: NovelEditor, command: SlashCommand, onClose: () => void) => {
  const { from } = editor.state.selection
  editor.chain().focus().deleteRange({ from: from - 1, to: from }).run()
  editor.chain().focus().run()
  command.action(editor)
  onClose()
}

const SlashCommandMenu = ({ editor, onClose, showMenu }: { editor: NovelEditor; onClose: () => void; showMenu: boolean }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const search = ''

  const filteredCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (!showMenu) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()

        if (filteredCommands[selectedIndex]) {
          executeSlashCommand(editor, filteredCommands[selectedIndex], onClose)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [selectedIndex, filteredCommands, editor, onClose, showMenu])

  return (
    <div className="absolute z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
      <div className="max-h-64 overflow-y-auto py-1">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.id}
            onClick={() => {
              executeSlashCommand(editor, cmd, onClose)
            }}
            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${
              index === selectedIndex ? 'bg-gray-100' : ''
            }`}
          >
            <span className="font-bold text-gray-600 w-8">{cmd.icon}</span>
            <span>{cmd.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const TableToolbar = ({ editor, onClose }: { editor: NovelEditor; onClose: () => void }) => {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white shadow-lg p-1">
      <button
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="px-2 py-1 text-xs rounded hover:bg-gray-100 border border-gray-200 bg-white text-gray-700 transition-colors"
        title="行を追加"
      >
        +行
      </button>
      <button
        onClick={() => {
          let moved = true
          while (moved) {
            moved = editor.chain().focus().goToNextCell().run()
          }
          editor.chain().focus().addColumnAfter().run()
        }}
        className="px-2 py-1 text-xs rounded hover:bg-gray-100 border border-gray-200 bg-white text-gray-700 transition-colors"
        title="列を追加"
      >
        +列
      </button>
      <button
        onClick={() => {
          let moved = true
          while (moved) {
            const currentPos = editor.state.selection.from
            moved = editor.chain().focus().goToNextCell().run()
            if (editor.state.selection.from === currentPos) {
              moved = false
            }
          }
          editor.chain().focus().deleteRow().run()
        }}
        className="px-2 py-1 text-xs rounded hover:bg-gray-100 border border-gray-200 bg-white text-gray-700 transition-colors"
        title="行を削除"
      >
        -行
      </button>
      <button
        onClick={() => {
          let moved = true
          while (moved) {
            moved = editor.chain().focus().goToNextCell().run()
          }
          editor.chain().focus().deleteColumn().run()
        }}
        className="px-2 py-1 text-xs rounded hover:bg-gray-100 border border-gray-200 bg-white text-gray-700 transition-colors"
        title="列を削除"
      >
        -列
      </button>
      <button
        onClick={() => {
          editor.chain().focus().deleteTable().run()
          onClose()
        }}
        className="px-2 py-1 text-xs rounded hover:bg-red-100 border border-red-200 bg-white text-red-600 transition-colors"
        title="テーブルを削除"
      >
        削除
      </button>
    </div>
  )
}

export function FileEditor({ owner, repo }: FileEditorProps) {
  const { selectedFilePath } = useEditorStore()
  const githubToken = useAuthStore((state) => state.githubToken)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [showTableToolbar, setShowTableToolbar] = useState(false)
  const [tableToolbarPosition, setTableToolbarPosition] = useState({ top: 0, left: 0 })
  const [useDummyData, setUseDummyData] = useState(true) // ダミーデータ使用フラグ

  // TanStack Queryでファイル内容を取得
  const { data: fileData, isLoading } = useFileContent({
    owner: owner || '',
    repo: repo || '',
    path: selectedFilePath || '',
    enabled: !!owner && !!repo && !!selectedFilePath && !useDummyData,
    githubToken,
  })

  const editorContent = useMemo(() => {
    if (useDummyData) {
      return convertMarkdownToContent(DUMMY_MARKDOWN)
    }
    if (!fileData?.content) return null
    return convertMarkdownToContent(fileData.content)
  }, [fileData?.content, useDummyData])

  const EditorContentWrapper = () => {
    const { editor } = useEditor()

    useEffect(() => {
      if (!editor) return

      const slashMenuExt = editor.extensionManager.extensions.find(
        ext => ext.name === 'slashMenu'
      )
      if (slashMenuExt) {
        slashMenuExt.storage.menuOpen = showMenu
      }
    }, [editor])

    useEffect(() => {
      if (!editor) return

      const handleUpdate = () => {
        const { $from, from } = editor.state.selection
        const nodeStart = $from.start()
        const text = editor.state.doc.textBetween(Math.max(0, from - 1), from)
        const textFromStart = editor.state.doc.textBetween(nodeStart, from)

        // スラッシュコマンドチェック
        if (text === '/' && textFromStart === '/') {
          const { view } = editor
          const coords = view.coordsAtPos(from)

          setMenuPosition({
            top: coords.bottom + window.scrollY + 5,
            left: coords.left + window.scrollX
          })
          setShowMenu(true)
        } else {
          setShowMenu(false)
        }

        // テーブルチェック
        const { selection, doc } = editor.state
        const resolvedPos = doc.resolve(selection.from)
        let inTable = false
        let tablePos = null

        for (let i = resolvedPos.depth; i > 0; i--) {
          const node = resolvedPos.node(i)
          if (node.type.name === 'table') {
            inTable = true
            tablePos = resolvedPos.start(i)
            break
          }
        }

        if (inTable && tablePos !== null) {
          const { view } = editor
          const tableCoords = view.coordsAtPos(tablePos)

          setTableToolbarPosition({
            top: tableCoords.top + window.scrollY - 40,
            left: tableCoords.left + window.scrollX
          })
          setShowTableToolbar(true)
        } else {
          setShowTableToolbar(false)
        }
      }

      editor.on('update', handleUpdate)
      editor.on('selectionUpdate', handleUpdate)

      return () => {
        editor.off('update', handleUpdate)
        editor.off('selectionUpdate', handleUpdate)
      }
    }, [editor])

    return (
      <>
        {showMenu && editor && (
          <div
            style={{
              position: 'fixed',
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 9999
            }}
          >
            <SlashCommandMenu
              editor={editor}
              onClose={() => setShowMenu(false)}
              showMenu={showMenu}
            />
          </div>
        )}
        {showTableToolbar && editor && (
          <div
            style={{
              position: 'fixed',
              top: tableToolbarPosition.top,
              left: tableToolbarPosition.left,
              zIndex: 9999
            }}
          >
            <TableToolbar
              editor={editor}
              onClose={() => setShowTableToolbar(false)}
            />
          </div>
        )}
      </>
    )
  }

  return (
    <div className="flex-1 h-full overflow-auto bg-white dark:bg-gray-900 relative">
      {/* ダミーデータ切り替えボタン */}
      <button
        onClick={() => setUseDummyData(!useDummyData)}
        className="fixed top-20 right-4 z-50 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-lg"
      >
        {useDummyData ? 'テストデータ表示中' : '実データ表示中'}
      </button>

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
              className="min-h-full p-4 md:p-8 prose prose-lg max-w-none md:max-w-4xl md:mx-auto"
              immediatelyRender={false}
            >
              <EditorContentWrapper />
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
