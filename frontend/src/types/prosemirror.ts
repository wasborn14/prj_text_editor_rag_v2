// ProseMirror の型定義

// Novel/TipTap の JSONContent 型
export interface NovelJSONContent {
  type?: string
  attrs?: Record<string, unknown>
  content?: NovelJSONContent[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

// Novel Content型（複数の形式を受け入れ）
export type NovelContent = ProseMirrorDoc | NovelJSONContent | undefined

// Novel Editor型（再エクスポート用）
// 注意: 実際の使用時にはnovelライブラリからEditorInstanceをインポートして使用
export type { EditorInstance as NovelEditor } from 'novel'

export interface ProseMirrorTextNode {
  type: 'text'
  text: string
}

export interface ProseMirrorParagraphNode {
  type: 'paragraph'
  content?: (ProseMirrorTextNode | ProseMirrorNode)[]
}

export interface ProseMirrorHeadingNode {
  type: 'heading'
  attrs: { level: number }
  content?: (ProseMirrorTextNode | ProseMirrorNode)[]
}

export interface ProseMirrorListNode {
  type: 'bulletList'
  content: ProseMirrorListItemNode[]
}

export interface ProseMirrorOrderedListNode {
  type: 'orderedList'
  content: ProseMirrorListItemNode[]
}

export interface ProseMirrorBlockquoteNode {
  type: 'blockquote'
  content: ProseMirrorParagraphNode[]
}

export interface ProseMirrorCodeBlockNode {
  type: 'codeBlock'
  attrs?: { language?: string }
  content: ProseMirrorTextNode[]
}

export interface ProseMirrorListItemNode {
  type: 'listItem'
  content: ProseMirrorParagraphNode[]
}

export interface ProseMirrorTableNode {
  type: 'table'
  content: ProseMirrorTableRowNode[]
}

export interface ProseMirrorTableRowNode {
  type: 'tableRow'
  content: (ProseMirrorTableCellNode | ProseMirrorTableHeaderNode)[]
}

export interface ProseMirrorTableCellNode {
  type: 'tableCell'
  content: ProseMirrorParagraphNode[]
}

export interface ProseMirrorTableHeaderNode {
  type: 'tableHeader'
  content: ProseMirrorParagraphNode[]
}

export type ProseMirrorNode =
  | ProseMirrorTextNode
  | ProseMirrorParagraphNode
  | ProseMirrorHeadingNode
  | ProseMirrorListNode
  | ProseMirrorOrderedListNode
  | ProseMirrorBlockquoteNode
  | ProseMirrorCodeBlockNode
  | ProseMirrorListItemNode
  | ProseMirrorTableNode
  | ProseMirrorTableRowNode
  | ProseMirrorTableCellNode
  | ProseMirrorTableHeaderNode

export interface ProseMirrorDoc {
  type: 'doc'
  content: ProseMirrorNode[]
}
