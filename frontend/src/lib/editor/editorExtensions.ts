import StarterKit from '@tiptap/starter-kit'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Extension } from '@tiptap/core'
import ListItem from '@tiptap/extension-list-item'
import Link from '@tiptap/extension-link'

// Highlight.js設定
const lowlight = createLowlight(common)

// IME変換中フラグ（グローバル）
let isComposing = false

/**
 * IME（日本語入力）制御拡張
 */
const IMEExtension = Extension.create({
  name: 'imeHandler',

  onCreate() {
    // compositionstartとcompositionendをリッスン
    if (typeof window !== 'undefined') {
      const handleCompositionStart = () => {
        isComposing = true
      }
      const handleCompositionEnd = () => {
        isComposing = false
      }

      window.addEventListener('compositionstart', handleCompositionStart)
      window.addEventListener('compositionend', handleCompositionEnd)

      // クリーンアップ用に保存
      this.storage.cleanup = () => {
        window.removeEventListener('compositionstart', handleCompositionStart)
        window.removeEventListener('compositionend', handleCompositionEnd)
      }
    }
  },

  onDestroy() {
    this.storage.cleanup?.()
  },

  addStorage() {
    return {
      cleanup: null,
    }
  },
})

/**
 * スラッシュメニューが開いている時のEnterキー処理を制御する拡張
 */
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
        // IME変換中は何もしない
        if (isComposing) {
          return false
        }
        if (this.storage.menuOpen) {
          return true
        }
        return false
      },
    }
  },
})

// カスタムEnterキー処理（TipTap公式コマンドを使用）
const CustomEnterExtension = Extension.create({
  name: 'customEnter',

  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        // IME変換中は何もしない
        if (isComposing) {
          return false
        }

        const { state } = editor
        const { selection } = state
        const { $from, empty } = selection

        // 選択範囲がある場合はデフォルト動作
        if (!empty) {
          return false
        }

        // リストアイテム内かチェック
        const { listItem } = state.schema.nodes
        let currentListItemDepth = -1

        for (let i = $from.depth; i > 0; i--) {
          if ($from.node(i).type === listItem) {
            currentListItemDepth = i
            break
          }
        }

        // リストアイテム内でない場合はデフォルト動作
        if (currentListItemDepth === -1) {
          return false
        }

        // 空のリストアイテムかチェック
        const currentListItem = $from.node(currentListItemDepth)
        const isEmpty = currentListItem.textContent.length === 0

        // テキストがある場合は通常の分割
        if (!isEmpty) {
          return editor.commands.splitListItem('listItem')
        }

        // 空のリストアイテムの場合
        // ネストされているかチェック（親にもリストアイテムがあるか）
        let parentListItemDepth = -1
        for (let i = currentListItemDepth - 1; i > 0; i--) {
          if ($from.node(i).type === listItem) {
            parentListItemDepth = i
            break
          }
        }

        if (parentListItemDepth > 0) {
          // ネストあり: liftListItemで1段上げる
          return editor.commands.liftListItem('listItem')
        } else {
          // 1段目: リストから抜ける
          return (
            editor.commands.lift('listItem') || editor.commands.clearNodes()
          )
        }
      },
    }
  },

  priority: 1000, // 他の拡張より優先
})

/**
 * 保存ショートカット拡張 (Cmd+S / Ctrl+S)
 */
const SaveExtension = Extension.create({
  name: 'saveShortcut',

  addKeyboardShortcuts() {
    return {
      'Mod-s': () => {
        // カスタムイベントを発行して保存をトリガー
        window.dispatchEvent(new CustomEvent('editor:save'))
        return true // デフォルトのブラウザ保存を防止
      },
    }
  },

  priority: 1000,
})

/**
 * エディタの拡張機能を取得
 */
export function getEditorExtensions() {
  return [
    IMEExtension, // IME制御
    SaveExtension, // 保存ショートカット
    CustomEnterExtension, // 最優先で配置
    StarterKit.configure({
      codeBlock: false, // デフォルトのCodeBlockを無効化
      listItem: false, // デフォルトのListItemを無効化（後で再設定）
      bulletList: {
        keepMarks: true,
        keepAttributes: false,
      },
      orderedList: {
        keepMarks: true,
        keepAttributes: false,
      },
    }),
    ListItem.configure({
      HTMLAttributes: {
        class: 'list-item',
      },
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
    Link.configure({
      openOnClick: true,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
  ]
}
