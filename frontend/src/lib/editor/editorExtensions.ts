import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Extension } from '@tiptap/core'

// Highlight.js設定
const lowlight = createLowlight(common)

// スラッシュメニュー拡張
const SlashMenuExtension = Extension.create({
  name: 'slashMenu',

  addStorage() {
    return {
      menuOpen: false,
    }
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        if (this.storage.menuOpen) {
          return true
        }
        return false
      },
    }
  },
})

/**
 * エディタの拡張機能を取得
 */
export function getEditorExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false, // デフォルトのCodeBlockを無効化
    }),
    CodeBlockLowlight.configure({
      lowlight,
      HTMLAttributes: {
        class: 'hljs', // highlight.js用クラス
      },
    }),
    SlashMenuExtension,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
  ]
}
