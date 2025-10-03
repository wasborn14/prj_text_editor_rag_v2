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
 * ProseMirrorドキュメントをMarkdownに変換
 */
export const proseMirrorToMarkdown = (doc: unknown): string => {
  if (!doc || typeof doc !== 'object') {
    return ''
  }

  const pmDoc = doc as ProseMirrorDoc
  if (!pmDoc.content || !Array.isArray(pmDoc.content)) {
    return ''
  }

  const lines: string[] = []

  for (const node of pmDoc.content) {
    const markdown = nodeToMarkdown(node)
    if (markdown) {
      lines.push(markdown)
    }
  }

  return lines.join('\n\n')
}

/**
 * ProseMirrorノードをMarkdownに変換
 */
const nodeToMarkdown = (node: ProseMirrorNode): string => {
  switch (node.type) {
    case 'heading':
      const level = node.attrs?.level || 1
      const headingText = extractText(node)
      return `${'#'.repeat(level)} ${headingText}`

    case 'paragraph':
      return extractText(node)

    case 'codeBlock':
      const language = node.attrs?.language || ''
      const code = extractText(node)
      return `\`\`\`${language}\n${code}\n\`\`\``

    case 'bulletList':
      return node.content?.map(item => {
        const text = extractText(item)
        return `- ${text}`
      }).join('\n') || ''

    case 'orderedList':
      return node.content?.map((item, index) => {
        const text = extractText(item)
        return `${index + 1}. ${text}`
      }).join('\n') || ''

    case 'blockquote':
      const quoteText = extractText(node)
      return `> ${quoteText}`

    case 'table':
      return tableToMarkdown(node as ProseMirrorTableNode)

    default:
      return extractText(node)
  }
}

/**
 * ノードからテキストを抽出
 */
const extractText = (node: ProseMirrorNode | undefined): string => {
  if (!node) {
    return ''
  }

  // TextNodeの場合
  if (node.type === 'text') {
    return node.text || ''
  }

  // contentプロパティを持つノードの場合
  if ('content' in node && node.content) {
    return node.content.map(child => {
      if (child.type === 'text') {
        return child.text || ''
      }
      if (child.type === 'paragraph' || child.type === 'listItem') {
        return extractText(child)
      }
      return ''
    }).join('')
  }

  return ''
}

/**
 * テーブルをMarkdownに変換
 */
const tableToMarkdown = (table: ProseMirrorTableNode): string => {
  if (!table.content || table.content.length === 0) {
    return ''
  }

  const rows = table.content.map((row) => {
    const cells = row.content?.map(cell => extractText(cell)) || []
    return `| ${cells.join(' | ')} |`
  })

  // ヘッダー区切り行を追加
  if (rows.length > 0 && table.content[0].content) {
    const headerCells = table.content[0].content.length
    const separator = `| ${Array(headerCells).fill('---').join(' | ')} |`
    rows.splice(1, 0, separator)
  }

  return rows.join('\n')
}

/**
 * Novel エディタからの変更を処理用のテキストに変換
 */
export const convertNovelChange = (content: unknown): string => {
  // Markdownに変換してから返す
  return proseMirrorToMarkdown(content)
}