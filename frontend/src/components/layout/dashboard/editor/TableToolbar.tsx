import type { NovelEditor } from '@/types/prosemirror'

interface TableToolbarProps {
  editor: NovelEditor
  onClose: () => void
}

export function TableToolbar({ editor, onClose }: TableToolbarProps) {
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
