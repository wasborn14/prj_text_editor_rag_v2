import type { JSONContent } from 'novel'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

interface MdastNode {
  type: string
  children?: MdastNode[]
  depth?: number
  value?: string
  lang?: string | null
  ordered?: boolean
  url?: string
  [key: string]: unknown
}

/**
 * MarkdownテキストをTipTap JSONContentに変換
 */
export function convertMarkdownToContent(markdown: string): JSONContent {
  try {
    const tree = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .parse(markdown)

    const content: JSONContent[] = []

    for (const node of tree.children) {
      const converted = convertMdastNode(node as MdastNode)
      if (converted) {
        content.push(converted)
      }
    }

    return {
      type: 'doc',
      content: content.length > 0 ? content : [{ type: 'paragraph' }]
    }
  } catch (error) {
    console.error('Markdown parsing error:', error)
    return {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: markdown }] }]
    }
  }
}

function convertMdastNode(node: MdastNode): JSONContent | null {
  switch (node.type) {
    case 'heading':
      return {
        type: 'heading',
        attrs: { level: node.depth },
        content: node.children?.map(convertInlineNode).filter((n): n is JSONContent => n !== null) || []
      }

    case 'paragraph':
      const paragraphContent = node.children?.map(convertInlineNode).filter((n): n is JSONContent => n !== null) || []
      // 空の段落の場合はスペース1つを入れる（TipTapの制約）
      return {
        type: 'paragraph',
        content: paragraphContent.length > 0 ? paragraphContent : [{ type: 'text', text: ' ' }]
      }

    case 'code':
      // Mermaidコードブロックの場合はMermaidノードに変換
      if (node.lang === 'mermaid') {
        return {
          type: 'mermaid',
          attrs: { code: node.value || '' }
        }
      }

      // 空のコードブロックの場合はスペース1つを入れる（TipTapの制約）
      const codeText = node.value || ' '
      return {
        type: 'codeBlock',
        attrs: node.lang ? { language: node.lang } : undefined,
        content: [{ type: 'text', text: codeText }]
      }

    case 'blockquote':
      return {
        type: 'blockquote',
        content: node.children?.map(convertMdastNode).filter((n): n is JSONContent => n !== null) || []
      }

    case 'list':
      return {
        type: node.ordered ? 'orderedList' : 'bulletList',
        content: node.children?.map(convertMdastNode).filter((n): n is JSONContent => n !== null) || []
      }

    case 'listItem':
      const listItemChildren = node.children?.map(convertMdastNode).filter((n): n is JSONContent => n !== null) || []
      const wrappedContent = listItemChildren.map(child => {
        if (child.type === 'paragraph') {
          return child
        }
        // heading や list などのブロック要素はそのまま返す（paragraphで包まない）
        if (child.type && ['heading', 'bulletList', 'orderedList', 'codeBlock', 'blockquote'].includes(child.type)) {
          return child
        }
        return {
          type: 'paragraph',
          content: [child]
        }
      })

      return {
        type: 'listItem',
        content: wrappedContent.length > 0 ? wrappedContent : [{ type: 'paragraph', content: [{ type: 'text', text: ' ' }] }]
      }

    case 'thematicBreak':
      return {
        type: 'horizontalRule'
      }

    case 'table':
      // 最初の行をヘッダーとして処理
      const tableRows = node.children || []
      const convertedRows = tableRows.map((rowNode, index) => {
        if (rowNode.type !== 'tableRow') return null

        const isHeaderRow = index === 0
        const cells = rowNode.children?.map(cellNode => {
          if (cellNode.type !== 'tableCell') return null

          // テーブルセルの子要素はinlineノード
          const cellInlineContent = cellNode.children?.map(convertInlineNode).filter((n): n is JSONContent => n !== null) || []

          return {
            type: isHeaderRow ? 'tableHeader' : 'tableCell',
            content: [
              {
                type: 'paragraph',
                content: cellInlineContent.length > 0 ? cellInlineContent : [{ type: 'text', text: ' ' }]
              }
            ]
          } as JSONContent
        }).filter((n): n is JSONContent => n !== null) || []

        return {
          type: 'tableRow',
          content: cells
        } as JSONContent
      }).filter((n): n is JSONContent => n !== null)

      return {
        type: 'table',
        content: convertedRows
      } as JSONContent

    case 'tableRow':
      return {
        type: 'tableRow',
        content: node.children?.map(convertMdastNode).filter((n): n is JSONContent => n !== null) || []
      }

    case 'tableCell':
      // テーブルセルの子要素はinlineノード（text, strong, emphasisなど）
      const cellInlineContent = node.children?.map(convertInlineNode).filter((n): n is JSONContent => n !== null) || []
      return {
        type: 'tableCell',
        content: [
          {
            type: 'paragraph',
            content: cellInlineContent.length > 0 ? cellInlineContent : [{ type: 'text', text: ' ' }]
          }
        ]
      }

    default:
      return null
  }
}

function convertInlineNode(node: MdastNode): JSONContent | null {
  switch (node.type) {
    case 'text':
      // 空文字列や未定義の場合はnullを返す（テキストノード自体を作らない）
      if (!node.value) {
        return null
      }
      return {
        type: 'text',
        text: node.value
      }

    case 'strong':
      const strongContent = node.children?.map(convertInlineNode).filter((n): n is JSONContent => n !== null) || []
      if (strongContent.length === 1 && strongContent[0].type === 'text') {
        return {
          type: 'text',
          text: strongContent[0].text,
          marks: [{ type: 'bold' }]
        }
      }
      return null

    case 'emphasis':
      const emphasisContent = node.children?.map(convertInlineNode).filter((n): n is JSONContent => n !== null) || []
      if (emphasisContent.length === 1 && emphasisContent[0].type === 'text') {
        return {
          type: 'text',
          text: emphasisContent[0].text,
          marks: [{ type: 'italic' }]
        }
      }
      return null

    case 'inlineCode':
      return {
        type: 'text',
        text: node.value,
        marks: [{ type: 'code' }]
      }

    case 'link':
      const linkContent = node.children?.map(convertInlineNode).filter((n): n is JSONContent => n !== null) || []
      if (linkContent.length === 1 && linkContent[0].type === 'text') {
        return {
          type: 'text',
          text: linkContent[0].text,
          marks: [{ type: 'link', attrs: { href: node.url } }]
        }
      }
      return null

    default:
      if (node.value) {
        return { type: 'text', text: node.value }
      }
      return null
  }
}

/**
 * TipTap JSONContentをMarkdownテキストに変換
 */
export function convertContentToMarkdown(json: JSONContent): string {
  if (!json || !json.content) return ''

  const lines: string[] = []

  for (const node of json.content) {
    const markdown = convertNodeToMarkdown(node)
    if (markdown) {
      lines.push(markdown)
    }
  }

  return lines.join('\n\n')
}

function convertNodeToMarkdown(node: JSONContent, listLevel = 0): string {
  if (!node.type) return ''

  switch (node.type) {
    case 'heading':
      const level = node.attrs?.level || 1
      const headingText = convertInlineContent(node.content || [])
      return `${'#'.repeat(level)} ${headingText}`

    case 'paragraph':
      return convertInlineContent(node.content || [])

    case 'codeBlock':
      const lang = node.attrs?.language || ''
      const code = node.content?.[0]?.text || ''
      return `\`\`\`${lang}\n${code}\n\`\`\``

    case 'blockquote':
      const quoteLines = node.content?.map(n => convertNodeToMarkdown(n)) || []
      return quoteLines.map(line => `> ${line}`).join('\n')

    case 'bulletList':
      return node.content?.map((item) => {
        const itemText = convertListItem(item, listLevel)
        return `${'  '.repeat(listLevel)}- ${itemText}`
      }).join('\n') || ''

    case 'orderedList':
      return node.content?.map((item, index) => {
        const itemText = convertListItem(item, listLevel)
        return `${'  '.repeat(listLevel)}${index + 1}. ${itemText}`
      }).join('\n') || ''

    case 'listItem':
      return convertListItem(node, listLevel)

    case 'horizontalRule':
      return '---'

    case 'hardBreak':
      return '  '

    case 'table':
      return convertTableToMarkdown(node)

    case 'mermaid':
      const mermaidCode = node.attrs?.code || ''
      return `\`\`\`mermaid\n${mermaidCode}\n\`\`\``

    default:
      return ''
  }
}

function convertTableToMarkdown(tableNode: JSONContent): string {
  if (!tableNode.content || tableNode.content.length === 0) return ''

  const rows: string[][] = []

  // 各行を処理
  for (const rowNode of tableNode.content) {
    if (rowNode.type !== 'tableRow' || !rowNode.content) continue

    const cells: string[] = []
    for (const cellNode of rowNode.content) {
      if (cellNode.type === 'tableCell' || cellNode.type === 'tableHeader') {
        const cellText = cellNode.content
          ?.map(n => convertNodeToMarkdown(n))
          .join(' ')
          .trim() || ''
        cells.push(cellText)
      }
    }
    rows.push(cells)
  }

  if (rows.length === 0) return ''

  // Markdown表形式に整形
  const lines: string[] = []

  // ヘッダー行
  if (rows.length > 0) {
    lines.push('| ' + rows[0].join(' | ') + ' |')
    // 区切り行
    lines.push('|' + rows[0].map(() => '------').join('|') + '|')
  }

  // データ行
  for (let i = 1; i < rows.length; i++) {
    lines.push('| ' + rows[i].join(' | ') + ' |')
  }

  return lines.join('\n')
}

function convertListItem(node: JSONContent, level: number): string {
  if (!node.content) return ''

  const parts: string[] = []

  for (const child of node.content) {
    if (child.type === 'paragraph') {
      parts.push(convertInlineContent(child.content || []))
    } else if (child.type === 'bulletList' || child.type === 'orderedList') {
      // ネストされたリスト
      const nested = convertNodeToMarkdown(child, level + 1)
      parts.push('\n' + nested)
    }
  }

  return parts.join('')
}

function convertInlineContent(content: JSONContent[]): string {
  return content.map(node => {
    if (node.type === 'text') {
      let text = node.text || ''

      // マークを適用
      if (node.marks) {
        for (const mark of node.marks) {
          switch (mark.type) {
            case 'bold':
              text = `**${text}**`
              break
            case 'italic':
              text = `*${text}*`
              break
            case 'code':
              text = `\`${text}\``
              break
            case 'link':
              text = `[${text}](${mark.attrs?.href || ''})`
              break
          }
        }
      }

      return text
    }
    return ''
  }).join('')
}
