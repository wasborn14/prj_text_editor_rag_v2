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
      return {
        type: 'paragraph',
        content: paragraphContent.length > 0 ? paragraphContent : undefined
      }

    case 'code':
      return {
        type: 'codeBlock',
        attrs: node.lang ? { language: node.lang } : undefined,
        content: [{ type: 'text', text: node.value || '' }]
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
        return {
          type: 'paragraph',
          content: [child]
        }
      })

      return {
        type: 'listItem',
        content: wrappedContent.length > 0 ? wrappedContent : [{ type: 'paragraph' }]
      }

    case 'thematicBreak':
      return {
        type: 'horizontalRule'
      }

    default:
      return null
  }
}

function convertInlineNode(node: MdastNode): JSONContent | null {
  switch (node.type) {
    case 'text':
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
