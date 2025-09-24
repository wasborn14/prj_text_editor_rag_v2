'use client'

import { useState } from 'react'

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  children?: FileTreeNode[]
}

interface FileTreeProps {
  nodes: FileTreeNode[]
  onFileSelect?: (node: FileTreeNode) => void
  className?: string
}

interface FileTreeItemProps {
  node: FileTreeNode
  level: number
  onFileSelect?: (node: FileTreeNode) => void
}

function FileTreeItem({ node, level, onFileSelect }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleClick = () => {
    if (node.type === 'file') {
      onFileSelect?.(node)
    } else {
      // ディレクトリの場合は展開/折りたたみのみ
      setIsExpanded(!isExpanded)
    }
  }

  const getFileIcon = (node: FileTreeNode) => {
    if (node.type === 'dir') {
      return isExpanded ? '📂' : '📁'
    }

    // ファイル拡張子に基づくアイコン
    const extension = node.name.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return '📜'
      case 'json':
        return '📄'
      case 'md':
        return '📝'
      case 'css':
      case 'scss':
      case 'sass':
        return '🎨'
      case 'html':
        return '🌐'
      case 'py':
        return '🐍'
      case 'java':
        return '☕'
      case 'go':
        return '🐹'
      case 'rs':
        return '🦀'
      case 'yml':
      case 'yaml':
        return '⚙️'
      case 'docker':
      case 'dockerfile':
        return '🐳'
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return '🖼️'
      default:
        return '📄'
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
  }

  return (
    <div>
      <div
        className={`
          flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 rounded
          ${node.type === 'file' ? 'hover:bg-blue-50' : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        <span className="mr-2 text-sm">
          {getFileIcon(node)}
        </span>
        <span className="flex-1 text-sm text-gray-900 truncate">
          {node.name}
        </span>
        {node.type === 'file' && node.size && (
          <span className="text-xs text-gray-500 ml-2">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>

      {node.type === 'dir' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ nodes, onFileSelect, className = '' }: FileTreeProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      <div className="max-h-96 overflow-y-auto">
        {nodes.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No files found
          </div>
        ) : (
          <div className="py-2">
            {nodes.map((node) => (
              <FileTreeItem
                key={node.path}
                node={node}
                level={0}
                onFileSelect={onFileSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}