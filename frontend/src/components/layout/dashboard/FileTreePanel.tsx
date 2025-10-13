import React from 'react'
import {
  FolderOpen,
  File,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Repository, FileTreeItem } from '@/lib/github'

interface TreeNode {
  name: string
  fullPath: string
  type: 'file' | 'dir'
  children: { [key: string]: TreeNode }
}

interface FileTreePanelProps {
  selectedRepo: Repository | null
  fileTree: FileTreeItem[]
  treeLoading: boolean
  expandedDirs: Set<string>
  error: string | null
  onToggleDirectory: (path: string) => void
}

export function FileTreePanel({
  selectedRepo,
  fileTree,
  treeLoading,
  expandedDirs,
  error,
  onToggleDirectory,
}: FileTreePanelProps) {
  // ファイルツリーを階層構造に変換
  const buildFileTree = (): { [key: string]: TreeNode } => {
    const root: { [key: string]: TreeNode } = {}

    fileTree.forEach((item) => {
      const parts = item.path.split('/')
      let current: { [key: string]: TreeNode } = root

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            fullPath: parts.slice(0, index + 1).join('/'),
            type: index === parts.length - 1 ? item.type : 'dir',
            children: {},
          }
        }
        current = current[part].children
      })
    })

    return root
  }

  const renderTree = (
    node: { [key: string]: TreeNode },
    level = 0
  ): React.ReactElement | null => {
    const entries = Object.entries(node)
    if (entries.length === 0) return null

    return (
      <div className="space-y-0.5">
        {entries.map(([key, value]) => {
          const isDir = value.type === 'dir'
          const isExpanded = expandedDirs.has(value.fullPath)

          return (
            <div key={value.fullPath}>
              <button
                onClick={() => isDir && onToggleDirectory(value.fullPath)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ paddingLeft: `${level * 16 + 8}px` }}
              >
                {isDir ? (
                  <>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <FolderOpen className="h-4 w-4 text-blue-500" />
                  </>
                ) : (
                  <>
                    <span className="w-4" />
                    <File className="h-4 w-4 text-gray-400" />
                  </>
                )}
                <span className="truncate text-gray-900 dark:text-gray-100">
                  {value.name}
                </span>
              </button>
              {isDir && isExpanded && renderTree(value.children, level + 1)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="w-80 flex-shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
        ファイル一覧
      </h2>

      {!selectedRepo && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          リポジトリを選択してください
        </p>
      )}

      {selectedRepo && treeLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          読み込み中...
        </div>
      )}

      {selectedRepo && !treeLoading && fileTree.length > 0 && (
        <div className="text-sm">{renderTree(buildFileTree())}</div>
      )}

      {selectedRepo && !treeLoading && fileTree.length === 0 && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          ファイルが見つかりませんでした
        </p>
      )}
    </div>
  )
}
