import {
  ProseMirrorDoc,
  ProseMirrorNode,
  ProseMirrorTableNode,
  ProseMirrorTableRowNode,
  ProseMirrorTableCellNode,
  ProseMirrorTableHeaderNode
} from '@/types/prosemirror'

/**
 * マークダウンテキストまたはJSONをProseMirror形式に変換
 */
export const parseToProseMirror = (content: string): ProseMirrorDoc | undefined => {
  if (!content || content.trim() === '') {
    return undefined
  }

  try {
    // 既にJSON形式の場合はそのまま返す
    return JSON.parse(content)
  } catch {
    // マークダウンテキストを解析してProseMirror構造に変換
    const lines = content.split('\n')
    const docContent: ProseMirrorNode[] = []
    let inCodeBlock = false
    let codeBlockContent: string[] = []
    let codeBlockLanguage = ''

    let inTable = false
    let tableRows: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // コードブロックの処理
      if (line.startsWith('```')) {
        if (!inCodeBlock) {
          // コードブロック開始
          inCodeBlock = true
          codeBlockLanguage = line.substring(3).trim()
          codeBlockContent = []
        } else {
          // コードブロック終了
          inCodeBlock = false
          docContent.push({
            type: 'codeBlock',
            attrs: { language: codeBlockLanguage || 'text' },
            content: [{ type: 'text', text: codeBlockContent.join('\n') }]
          })
          codeBlockContent = []
          codeBlockLanguage = ''
        }
        continue
      }

      // コードブロック内の場合
      if (inCodeBlock) {
        codeBlockContent.push(line)
        continue
      }

      // テーブル処理
      if (line.includes('|') && !line.startsWith('|---')) {
        if (!inTable) {
          inTable = true
          tableRows = []
        }
        tableRows.push(line)
        continue
      } else if (inTable && !line.includes('|')) {
        // テーブル終了
        inTable = false
        const tableNode = parseMarkdownTable(tableRows)
        if (tableNode) {
          docContent.push(tableNode)
        }
        tableRows = []
        // 現在の行も処理する必要があるので、fall throughしない
      } else if (line.startsWith('|---') || line.trim() === '') {
        // セパレーター行や空行はスキップ
        continue
      }
      if (line.startsWith('# ')) {
        docContent.push({
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: line.substring(2) }]
        })
      } else if (line.startsWith('## ')) {
        docContent.push({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: line.substring(3) }]
        })
      } else if (line.startsWith('### ')) {
        docContent.push({
          type: 'heading',
          attrs: { level: 3 },
          content: [{ type: 'text', text: line.substring(4) }]
        })
      } else if (line.startsWith('#### ')) {
        docContent.push({
          type: 'heading',
          attrs: { level: 4 },
          content: [{ type: 'text', text: line.substring(5) }]
        })
      } else if (line.startsWith('##### ')) {
        docContent.push({
          type: 'heading',
          attrs: { level: 5 },
          content: [{ type: 'text', text: line.substring(6) }]
        })
      } else if (line.startsWith('###### ')) {
        docContent.push({
          type: 'heading',
          attrs: { level: 6 },
          content: [{ type: 'text', text: line.substring(7) }]
        })
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        docContent.push({
          type: 'bulletList',
          content: [{
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text: line.substring(2) }]
            }]
          }]
        })
      } else if (/^\d+\.\s/.test(line)) {
        // 番号付きリスト (1. item)
        const text = line.replace(/^\d+\.\s/, '')
        docContent.push({
          type: 'orderedList',
          content: [{
            type: 'listItem',
            content: [{
              type: 'paragraph',
              content: [{ type: 'text', text }]
            }]
          }]
        })
      } else if (line.startsWith('> ')) {
        // 引用 (> quote)
        docContent.push({
          type: 'blockquote',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: line.substring(2) }]
          }]
        })
      } else if (line.trim() !== '') {
        docContent.push({
          type: 'paragraph',
          content: [{ type: 'text', text: line }]
        })
      }
    }

    // ループ終了時にテーブルが残っている場合
    if (inTable && tableRows.length > 0) {
      const tableNode = parseMarkdownTable(tableRows)
      if (tableNode) {
        docContent.push(tableNode)
      }
    }

    const result: ProseMirrorDoc = {
      type: 'doc',
      content: docContent.length > 0 ? docContent : [{
        type: 'paragraph',
        content: []
      }]
    }
    return result
  }
}

/**
 * マークダウンテーブルをProseMirror形式に変換
 */
const parseMarkdownTable = (tableRows: string[]): ProseMirrorTableNode | null => {
  if (tableRows.length === 0) return null

  const rows: ProseMirrorTableRowNode[] = []

  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i]
    const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')

    if (cells.length === 0) continue

    const isHeaderRow = i === 0
    const rowCells: (ProseMirrorTableCellNode | ProseMirrorTableHeaderNode)[] = cells.map(cellText =>
      isHeaderRow
        ? {
            type: 'tableHeader' as const,
            content: [{
              type: 'paragraph' as const,
              content: [{ type: 'text' as const, text: cellText }]
            }]
          } as ProseMirrorTableHeaderNode
        : {
            type: 'tableCell' as const,
            content: [{
              type: 'paragraph' as const,
              content: [{ type: 'text' as const, text: cellText }]
            }]
          } as ProseMirrorTableCellNode
    )

    rows.push({
      type: 'tableRow' as const,
      content: rowCells
    } as ProseMirrorTableRowNode)
  }

  if (rows.length === 0) return null

  return {
    type: 'table' as const,
    content: rows
  } as ProseMirrorTableNode
}

/**
 * ProseMirror JSONをプレーンテキストに変換
 */
export const proseMirrorToPlainText = (doc: unknown): string => {
  if (!doc || typeof doc !== 'object') {
    return ''
  }

  // 簡単な実装: JSONとして保存
  return JSON.stringify(doc)
}

/**
 * Novel エディタからの変更を処理用のテキストに変換
 */
export const convertNovelChange = (content: unknown): string => {
  return content ? JSON.stringify(content) : ''
}