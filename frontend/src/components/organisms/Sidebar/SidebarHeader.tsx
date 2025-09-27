'use client'

import React from 'react'
import { ViewModeToggle } from '@/components/atoms/ToggleButton/ToggleButton'
import { Icon } from '@/components/atoms/Icon/Icon'
import { useSidebarStore, ViewMode } from '@/stores/sidebarStore'

interface SidebarHeaderProps {
  repositoryName?: string
  onSettingsClick?: () => void
  className?: string
}

export function SidebarHeader({
  repositoryName,
  onSettingsClick,
  className = ''
}: SidebarHeaderProps) {
  const { viewMode, setViewMode, pinnedFiles } = useSidebarStore()

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
  }

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      {/* メインヘッダー */}
      <div className="flex items-center justify-between px-3 py-2">
        {/* リポジトリ名部分 */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {repositoryName ? (
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {repositoryName}
            </h3>
          ) : (
            <h3 className="text-sm font-semibold text-gray-500 truncate">
              No repository selected
            </h3>
          )}
        </div>

        {/* 右側ボタン群 */}
        <div className="flex items-center space-x-1">
          {/* 表示モード切り替え */}
          <ViewModeToggle
            currentMode={viewMode}
            onModeChange={handleModeChange}
          />

          {/* 設定ボタン */}
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-1 rounded hover:bg-gray-100"
              title="Sidebar Settings"
            >
              <Icon type="settings" size="xs" className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* モード別サブヘッダー */}
      {viewMode === 'bookmarks' && (
        <div className="px-3 py-1 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {pinnedFiles.length > 0
                ? `${pinnedFiles.length} pinned files`
                : 'No pinned files'
              }
            </span>
            {pinnedFiles.length > 0 && (
              <button
                onClick={() => {
                  // 全てのピンを解除する機能（必要に応じて実装）
                  console.log('Clear all pins')
                }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="px-3 py-1 bg-gray-50 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            Flat file listing
          </div>
        </div>
      )}

      {viewMode === 'tree' && (
        <div className="px-3 py-1 bg-gray-50 border-t border-gray-100">
          <div className="text-xs text-gray-600">
            Hierarchical view
          </div>
        </div>
      )}
    </div>
  )
}

// 検索バー付きヘッダー（将来の拡張用）
export function SidebarHeaderWithSearch({
  repositoryName,
  onSearch,
  onSettingsClick,
  className = ''
}: SidebarHeaderProps & {
  onSearch?: (query: string) => void
}) {
  const { viewMode, setViewMode } = useSidebarStore()
  const [searchQuery, setSearchQuery] = React.useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode)
  }

  return (
    <div className={`bg-white border-b border-gray-200 ${className}`}>
      {/* メインヘッダー */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {repositoryName ? (
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {repositoryName}
            </h3>
          ) : (
            <h3 className="text-sm font-semibold text-gray-500 truncate">
              No repository selected
            </h3>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <ViewModeToggle
            currentMode={viewMode}
            onModeChange={handleModeChange}
          />
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="p-1 rounded hover:bg-gray-100"
              title="Sidebar Settings"
            >
              <Icon type="settings" size="xs" className="text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* 検索バー */}
      {onSearch && (
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
                  onSearch('')
                }}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
              >
                <Icon type="x" size="xs" className="text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}