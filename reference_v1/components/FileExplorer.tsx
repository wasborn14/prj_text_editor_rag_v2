'use client'

import { useState, useMemo, useCallback } from 'react'
import { useFiles } from '@/hooks/useFiles'
import { ChevronRight, ChevronDown, FileText, Folder, FolderOpen } from 'lucide-react'

interface FileItem {
  id: string
  repository_id: string
  path: string
  name: string
  type: 'file' | 'folder'
  content?: string
  github_sha?: string
  created_at: string
  updated_at: string
}

interface FileExplorerProps {
  onFileSelect: (file: FileItem) => void
  selectedPath?: string
  selectedRepository?: any
}

export default function FileExplorer({ onFileSelect, selectedPath, selectedRepository }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['/']))

  // Use TanStack Query hook
  const { data: files = [], isLoading, error } = useFiles(selectedRepository)

  // Build file tree structure from flat files array
  const fileTree = useMemo(() => {
    const tree: any = { '/': { type: 'folder', name: '/', path: '/', children: {} } }

    files.forEach(file => {
      const pathParts = file.path.split('/').filter(p => p)
      let currentLevel = tree['/'].children
      let currentPath = ''

      // Build nested structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += '/' + pathParts[i]
        if (!currentLevel[pathParts[i]]) {
          currentLevel[pathParts[i]] = {
            type: 'folder',
            name: pathParts[i],
            path: currentPath,
            children: {}
          }
        }
        currentLevel = currentLevel[pathParts[i]].children
      }

      // Add file or folder to tree
      if (file.type === 'folder') {
        const folderName = pathParts[pathParts.length - 1]
        currentLevel[folderName] = {
          ...file,
          children: {}
        }
      } else {
        const fileName = pathParts[pathParts.length - 1]
        currentLevel[fileName] = file
      }
    })

    return tree
  }, [files])

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(path)) {
        newSet.delete(path)
      } else {
        newSet.add(path)
      }
      return newSet
    })
  }, [])

  // Render file tree recursively
  const renderFileTree = (node: any, level = 0) => {
    if (node.type === 'folder') {
      const isExpanded = expandedFolders.has(node.path)
      const hasChildren = Object.keys(node.children || {}).length > 0

      return (
        <div key={node.path}>
          <div
            className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
              selectedPath === node.path ? 'bg-blue-100 dark:bg-blue-900' : ''
            }`}
            style={{ paddingLeft: `${level * 16 + 8}px` }}
            onClick={() => toggleFolder(node.path)}
          >
            {hasChildren && (
              isExpanded ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />
            )}
            {!hasChildren && <span className="w-4 mr-1" />}
            {isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-gray-500" />
            )}
            <span className="text-sm truncate">{node.name}</span>
          </div>
          {isExpanded && node.children && (
            <div>
              {Object.values(node.children)
                .sort((a: any, b: any) => {
                  if (a.type === b.type) return a.name.localeCompare(b.name)
                  return a.type === 'folder' ? -1 : 1
                })
                .map((child: any) => renderFileTree(child, level + 1))}
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div
          key={node.path}
          className={`flex items-center py-1 px-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${
            selectedPath === node.path ? 'bg-blue-100 dark:bg-blue-900' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => onFileSelect(node)}
        >
          <FileText className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-sm truncate">{node.name}</span>
        </div>
      )
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Loading files...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-500">
        Error loading files
      </div>
    )
  }

  if (!selectedRepository) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No repository selected
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No files found
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {Object.values(fileTree['/'].children)
        .sort((a: any, b: any) => {
          if (a.type === b.type) return a.name.localeCompare(b.name)
          return a.type === 'folder' ? -1 : 1
        })
        .map((child: any) => renderFileTree(child))}
    </div>
  )
}