'use client'

import React, { useState, useEffect } from 'react'
import { EditorRoot, EditorContent, useEditor, StarterKit } from 'novel'
import '@/styles/novel.css'
import { NovelContent, NovelEditor } from '@/types/prosemirror'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'

interface SlashCommand {
  id: string
  label: string
  icon: string
  action: (editor: NovelEditor) => void
}

const SlashCommandMenu = ({ editor, onClose }: { editor: NovelEditor; onClose: () => void }) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  // const [search, setSearch] = useState('')  // 一旦非表示
  const search = ''  // 検索は無効化

  const commands: SlashCommand[] = [
    {
      id: 'h1',
      label: 'Heading 1',
      icon: 'H1',
      action: (editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run()
      }
    },
    {
      id: 'h2',
      label: 'Heading 2',
      icon: 'H2',
      action: (editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run()
      }
    },
    {
      id: 'h3',
      label: 'Heading 3',
      icon: 'H3',
      action: (editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run()
      }
    },
    {
      id: 'paragraph',
      label: 'Text',
      icon: '¶',
      action: (editor) => {
        editor.chain().focus().setParagraph().run()
      }
    },
    {
      id: 'bullet',
      label: 'Bullet List',
      icon: '•',
      action: (editor) => {
        editor.chain().focus().toggleBulletList().run()
      }
    },
    {
      id: 'number',
      label: 'Numbered List',
      icon: '1.',
      action: (editor) => {
        editor.chain().focus().toggleOrderedList().run()
      }
    },
    {
      id: 'quote',
      label: 'Quote',
      icon: '"',
      action: (editor) => {
        editor.chain().focus().toggleBlockquote().run()
      }
    },
    {
      id: 'code',
      label: 'Code Block',
      icon: '</>',
      action: (editor) => {
        editor.chain().focus().setCodeBlock().run()
      }
    },
    {
      id: 'table',
      label: 'Table',
      icon: '⊞',
      action: (editor) => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
      }
    }
  ]

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          // Remove the slash
          editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).run()
          // Execute command
          filteredCommands[selectedIndex].action(editor)
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, filteredCommands, editor, onClose])

  return (
    <div className="absolute z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
      {/* 検索ボックスを非表示（コメントアウト） */}
      {/* <div className="p-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search commands..."
          className="w-full rounded px-2 py-1 text-sm outline-none border border-gray-100 focus:border-blue-400"
          autoFocus
        />
      </div> */}
      <div className="max-h-64 overflow-y-auto py-1">
        {filteredCommands.map((cmd, index) => (
          <button
            key={cmd.id}
            onClick={() => {
              editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).run()
              cmd.action(editor)
              onClose()
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
        onClick={() => {
          editor.chain().focus().addRowAfter().run()
        }}
        className="px-2 py-1 text-xs rounded hover:bg-gray-100 border border-gray-200 bg-white text-gray-700 transition-colors"
        title="行を追加"
      >
        +行
      </button>
      <button
        onClick={() => {
          // シンプルに現在の行の一番右端に移動してから列追加
          let moved = true
          // 現在の行の最後のセルまで移動
          while (moved) {
            moved = editor.chain().focus().goToNextCell().run()
          }
          // 最後のセルで列を追加
          editor.chain().focus().addColumnAfter().run()
        }}
        className="px-2 py-1 text-xs rounded hover:bg-gray-100 border border-gray-200 bg-white text-gray-700 transition-colors"
        title="列を追加"
      >
        +列
      </button>
      <button
        onClick={() => {
          // 最後の行に移動してから行削除
          let moved = true
          // テーブルの最後の行まで移動
          while (moved) {
            const currentPos = editor.state.selection.from
            moved = editor.chain().focus().goToNextCell().run()
            // 次の行に移動したかチェック（同じ位置なら移動失敗）
            if (editor.state.selection.from === currentPos) {
              moved = false
            }
          }
          // 最後の行で行を削除
          editor.chain().focus().deleteRow().run()
        }}
        className="px-2 py-1 text-xs rounded hover:bg-gray-100 border border-gray-200 bg-white text-gray-700 transition-colors"
        title="行を削除"
      >
        -行
      </button>
      <button
        onClick={() => {
          // 最後の列に移動してから列削除
          let moved = true
          // 現在の行の最後のセルまで移動
          while (moved) {
            moved = editor.chain().focus().goToNextCell().run()
          }
          // 最後の列で列を削除
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

export const NovelWithMenu = ({ content, onChange }: { content?: NovelContent, onChange?: (content: NovelContent) => void }) => {
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [showTableToolbar, setShowTableToolbar] = useState(false)
  const [tableToolbarPosition, setTableToolbarPosition] = useState({ top: 0, left: 0 })

  const EditorContentWrapper = () => {
    const { editor } = useEditor()

    useEffect(() => {
      if (!editor) return

      const handleUpdate = () => {
        const { from } = editor.state.selection
        const text = editor.state.doc.textBetween(Math.max(0, from - 1), from)

        // Check for slash command
        if (text === '/') {
          // Get cursor position
          const { view } = editor
          const coords = view.coordsAtPos(from)

          // position: fixedなので、画面上の絶対位置を使用
          setMenuPosition({
            top: coords.bottom + window.scrollY + 5,  // スクロール位置も考慮
            left: coords.left + window.scrollX
          })
          setShowMenu(true)
        } else {
          setShowMenu(false)
        }

        // Check for table selection
        const { selection, doc } = editor.state
        const resolvedPos = doc.resolve(selection.from)
        let inTable = false
        let tablePos = null

        // Check if cursor is inside a table
        for (let i = resolvedPos.depth; i > 0; i--) {
          const node = resolvedPos.node(i)
          if (node.type.name === 'table') {
            inTable = true
            tablePos = resolvedPos.start(i)
            break
          }
        }

        if (inTable && tablePos !== null) {
          // Get table position for toolbar
          const { view } = editor
          const tableCoords = view.coordsAtPos(tablePos)

          setTableToolbarPosition({
            top: tableCoords.top + window.scrollY - 40,  // Position above table
            left: tableCoords.left + window.scrollX
          })
          setShowTableToolbar(true)
        } else {
          setShowTableToolbar(false)
        }
      }

      editor.on('update', handleUpdate)
      editor.on('selectionUpdate', handleUpdate)

      // Handle content changes
      const handleContentChange = () => {
        if (onChange) {
          onChange(editor.getJSON())
        }
      }

      editor.on('update', handleContentChange)

      return () => {
        editor.off('update', handleUpdate)
        editor.off('selectionUpdate', handleUpdate)
        editor.off('update', handleContentChange)
      }
    }, [editor]) // onChangeは依存配列から除外（外部からのprops）

    return (
      <>
        {showMenu && editor && (
          <div
            style={{
              position: 'fixed',  // fixedに変更
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 9999
            }}
          >
            <SlashCommandMenu
              editor={editor}
              onClose={() => setShowMenu(false)}
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
    <div className="w-full h-full">
      <EditorRoot>
        <EditorContent
          extensions={[
            StarterKit,
            Table.configure({
              resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
          ]}
          initialContent={content || {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [{ type: 'text', text: 'Welcome to Novel Editor' }]
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Type "/" to see commands menu' }]
              }
            ]
          }}
          className="min-h-full p-6 prose prose-lg max-w-full focus:outline-none"
        >
          <EditorContentWrapper />
        </EditorContent>
      </EditorRoot>
    </div>
  )
}