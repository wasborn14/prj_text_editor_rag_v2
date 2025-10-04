'use client'

import React, { useMemo } from 'react'
import { FileTreeItem, FileListItem, FileTreeNode } from './FileTreeItem'
import { useSidebarStore } from '@/stores/sidebarStore'
import { Icon } from '@/components/atoms/Icon/Icon'
import { CreateFileInput } from '@/components/molecules/CreateFileInput/CreateFileInput'

interface SidebarContentProps {
  files: FileTreeNode[]
  selectedFilePath?: string
  onFileSelect: (file: FileTreeNode) => void
  searchQuery?: string
  onCreateConfirm?: (name: string, type: 'file' | 'folder') => void
  className?: string
}

export function SidebarContent({
  files,
  selectedFilePath,
  onFileSelect,
  searchQuery = '',
  onCreateConfirm,
  className = ''
}: SidebarContentProps) {
  const { viewMode, pinnedFiles, creatingItem, cancelCreating } = useSidebarStore()

  // .gitkeepファイルを除外する関数
  const removeGitkeep = (nodes: FileTreeNode[]): FileTreeNode[] => {
    return nodes
      .filter(node => node.name !== '.gitkeep')
      .map(node => {
        if (node.type === 'dir' && node.children) {
          return {
            ...node,
            children: removeGitkeep(node.children)
          }
        }
        return node
      })
  }

  // 検索結果をフィルタリング
  const filteredFiles = useMemo(() => {
    // まず.gitkeepを除外
    const filesWithoutGitkeep = removeGitkeep(files)

    if (!searchQuery.trim()) return filesWithoutGitkeep

    const query = searchQuery.toLowerCase()

    const filterRecursive = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes.reduce((acc: FileTreeNode[], node) => {
        // ファイル名に検索クエリが含まれるかチェック
        const nameMatches = node.name.toLowerCase().includes(query)

        if (node.type === 'file') {
          if (nameMatches) {
            acc.push(node)
          }
        } else {
          // ディレクトリの場合、子要素も再帰的にチェック
          const filteredChildren = node.children ? filterRecursive(node.children) : []

          if (nameMatches || filteredChildren.length > 0) {
            acc.push({
              ...node,
              children: filteredChildren
            })
          }
        }

        return acc
      }, [])
    }

    return filterRecursive(filesWithoutGitkeep)
  }, [files, searchQuery])

  // ブックマーク表示用のファイルリスト
  const pinnedFileNodes = useMemo(() => {
    const allFiles: FileTreeNode[] = []

    const collectFiles = (nodes: FileTreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          allFiles.push(node)
        } else if (node.children) {
          collectFiles(node.children)
        }
      })
    }

    collectFiles(files)

    return allFiles.filter(file => pinnedFiles.includes(file.path))
  }, [files, pinnedFiles])

  // 表示モードに応じたレンダリング
  const renderContent = () => {
    switch (viewMode) {
      case 'tree':
        return renderTreeView()
      case 'list':
        return renderListView()
      case 'bookmarks':
        return renderBookmarksView()
      default:
        return renderTreeView()
    }
  }

  const renderTreeView = () => {
    if (filteredFiles.length === 0 && !creatingItem) {
      return renderEmptyState('No files found')
    }

    return (
      <div className="space-y-0.5">
        {filteredFiles.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            depth={0}
            isSelected={selectedFilePath === node.path}
            selectedFilePath={selectedFilePath}
            onSelect={onFileSelect}
            onCreateConfirm={onCreateConfirm}
          />
        ))}
        {creatingItem && creatingItem.parentPath === '' && (
          <CreateFileInput
            type={creatingItem.type}
            parentPath={creatingItem.parentPath}
            onConfirm={(name) => onCreateConfirm?.(name, creatingItem.type)}
            onCancel={cancelCreating}
          />
        )}
      </div>
    )
  }

  const renderListView = () => {
    // フラットなファイルリストを作成
    const flatFiles: FileTreeNode[] = []

    const flattenFiles = (nodes: FileTreeNode[]) => {
      nodes.forEach(node => {
        if (node.type === 'file') {
          flatFiles.push(node)
        } else if (node.children) {
          flattenFiles(node.children)
        }
      })
    }

    flattenFiles(filteredFiles)

    if (flatFiles.length === 0) {
      return renderEmptyState('No files found')
    }

    // ファイル名でソート
    const sortedFiles = flatFiles.sort((a, b) => a.name.localeCompare(b.name))

    return (
      <div className="space-y-1">
        {sortedFiles.map((node) => (
          <FileListItem
            key={node.path}
            node={node}
            isSelected={selectedFilePath === node.path}
            onSelect={onFileSelect}
            showPath={true}
          />
        ))}
      </div>
    )
  }

  const renderBookmarksView = () => {
    if (pinnedFileNodes.length === 0) {
      return renderEmptyState(
        'No pinned files',
        'Click the star icon next to any file to pin it here'
      )
    }

    return (
      <div className="space-y-1">
        {pinnedFileNodes.map((node) => (
          <FileListItem
            key={node.path}
            node={node}
            isSelected={selectedFilePath === node.path}
            onSelect={onFileSelect}
            showPath={true}
          />
        ))}
      </div>
    )
  }

  const renderEmptyState = (title: string, description?: string) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon
        type={viewMode === 'bookmarks' ? 'star' : 'file'}
        size="lg"
        className="text-gray-300 mb-3"
      />
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 max-w-48">{description}</p>
      )}
    </div>
  )

  return (
    <div className={`flex-1 overflow-auto p-2 ${className}`}>
      {renderContent()}
    </div>
  )
}