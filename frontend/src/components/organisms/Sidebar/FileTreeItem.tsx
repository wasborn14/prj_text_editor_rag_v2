'use client'

import React from 'react'
import { Icon, getFileIconType } from '@/components/atoms/Icon/Icon'
import { useSidebarStore } from '@/stores/sidebarStore'
import { CreateFileInput } from '@/components/molecules/CreateFileInput/CreateFileInput'

export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  children?: FileTreeNode[]
}

interface FileTreeItemProps {
  node: FileTreeNode
  depth: number
  isSelected: boolean
  selectedFilePath?: string
  onSelect: (node: FileTreeNode) => void
  onToggleExpand?: (path: string) => void
  onCreateConfirm?: (name: string, type: 'file' | 'folder') => void
  className?: string
}

export function FileTreeItem({
  node,
  depth,
  isSelected,
  selectedFilePath,
  onSelect,
  onToggleExpand,
  onCreateConfirm,
  className = ''
}: FileTreeItemProps) {
  const { isExpanded, toggleFolder, isPinned, togglePin, creatingItem, cancelCreating, setContextMenu } = useSidebarStore()
  const expanded = isExpanded(node.path)
  const pinned = isPinned(node.path)

  const handleClick = () => {
    if (node.type === 'dir') {
      toggleFolder(node.path)
      onToggleExpand?.(node.path)
      onSelect(node)  // ディレクトリも選択状態にする
    } else {
      onSelect(node)
    }
  }

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    togglePin(node.path)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetPath: node.path,
      targetType: node.type
    })
  }

  const indentStyle = {
    paddingLeft: `${depth * 16 + 8}px`
  }

  const itemClasses = `
    flex items-center w-full px-2 py-1 text-sm rounded
    hover:bg-gray-100 cursor-pointer
    ${isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  return (
    <div>
      {/* メインアイテム */}
      <div
        className={itemClasses}
        style={indentStyle}
        onClick={handleClick}
        onDoubleClick={() => node.type === 'file' && onSelect(node)}
        onContextMenu={handleContextMenu}
      >
        {/* 展開アイコン */}
        {node.type === 'dir' && (
          <div className="w-4 h-4 flex items-center justify-center mr-1">
            <Icon
              type={expanded ? 'chevron-down' : 'chevron-right'}
              size="xs"
              className="text-gray-400"
            />
          </div>
        )}

        {/* ファイル/フォルダアイコン */}
        <div className="w-4 h-4 flex items-center justify-center mr-2">
          {node.type === 'dir' ? (
            <Icon
              type={expanded ? 'folder-open' : 'folder'}
              size="sm"
              className={expanded ? 'text-blue-500' : 'text-gray-500'}
            />
          ) : (
            <Icon
              type={getFileIconType(node.name)}
              size="sm"
              className="text-gray-600"
            />
          )}
        </div>

        {/* ファイル/フォルダ名 */}
        <span className="flex-1 truncate">
          {node.name}
        </span>

        {/* ピンアイコン */}
        {(pinned || isSelected) && (
          <button
            onClick={handlePinToggle}
            className="ml-1 p-0.5 rounded hover:bg-gray-200"
            title={pinned ? 'Unpin file' : 'Pin file'}
          >
            <Icon
              type={pinned ? 'star-filled' : 'star'}
              size="xs"
              className={pinned ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}
            />
          </button>
        )}
      </div>

      {/* 子要素（フォルダが展開されている場合） */}
      {node.type === 'dir' && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              isSelected={selectedFilePath === child.path}
              selectedFilePath={selectedFilePath}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onCreateConfirm={onCreateConfirm}
            />
          ))}
          {/* このディレクトリ内に作成する場合 */}
          {creatingItem && creatingItem.parentPath === node.path && (
            <div style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}>
              <CreateFileInput
                type={creatingItem.type}
                parentPath={creatingItem.parentPath}
                onConfirm={(name) => onCreateConfirm?.(name, creatingItem.type)}
                onCancel={cancelCreating}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ファイルサイズをフォーマットするヘルパー関数
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// フラットなファイルリスト表示用コンポーネント
export function FileListItem({
  node,
  isSelected,
  onSelect,
  showPath = true,
  className = ''
}: {
  node: FileTreeNode
  isSelected: boolean
  onSelect: (node: FileTreeNode) => void
  showPath?: boolean
  className?: string
}) {
  const { isPinned, togglePin } = useSidebarStore()
  const pinned = isPinned(node.path)

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    togglePin(node.path)
  }

  const itemClasses = `
    flex items-center w-full px-3 py-2 text-sm rounded
    hover:bg-gray-100 cursor-pointer
    ${isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  return (
    <div
      className={itemClasses}
      onClick={() => onSelect(node)}
    >
      {/* ファイルアイコン */}
      <div className="w-4 h-4 flex items-center justify-center mr-3">
        <Icon
          type={getFileIconType(node.name)}
          size="sm"
          className="text-gray-600"
        />
      </div>

      {/* ファイル情報 */}
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">
          {node.name}
        </div>
        {showPath && (
          <div className="text-xs text-gray-500 truncate">
            {node.path}
          </div>
        )}
      </div>

      {/* ファイルサイズ */}
      {node.size && (
        <span className="text-xs text-gray-400 ml-2">
          {formatFileSize(node.size)}
        </span>
      )}

      {/* ピンアイコン */}
      <button
        onClick={handlePinToggle}
        className="ml-2 p-0.5 rounded hover:bg-gray-200"
        title={pinned ? 'Unpin file' : 'Pin file'}
      >
        <Icon
          type={pinned ? 'star-filled' : 'star'}
          size="xs"
          className={pinned ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}
        />
      </button>
    </div>
  )
}