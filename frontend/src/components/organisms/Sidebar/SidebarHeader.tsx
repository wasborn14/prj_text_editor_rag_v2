'use client'

import React from 'react'
import { FilePlus, FolderPlus, X } from 'lucide-react'

interface SidebarHeaderProps {
  repositoryName?: string
  onSearch?: (query: string) => void
  onCreateFile?: () => void
  onCreateFolder?: () => void
  className?: string
}

export function SidebarHeader({
  onSearch,
  onCreateFile,
  onCreateFolder,
  className = ''
}: SidebarHeaderProps) {
  const [searchQuery, setSearchQuery] = React.useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      {/* メインヘッダー */}
      <div className="flex items-center justify-end px-3 py-2">
        <div className="flex items-center space-x-1">
          {/* 新規ファイル作成 */}
          <button
            onClick={onCreateFile}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="New File"
          >
            <FilePlus className="w-4 h-4 text-gray-600" />
          </button>

          {/* 新規フォルダ作成 */}
          <button
            onClick={onCreateFolder}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 検索バー */}
      <div className="px-3 pb-2">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search files..."
            className="w-full px-3 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                onSearch?.('')
              }}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
            >
              <X className="w-3 h-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}