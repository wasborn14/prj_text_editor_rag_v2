import React from 'react'
import { Menu, X, LogOut, Save } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useEditorStore } from '@/stores/editorStore'
import { useRAGPanelStore } from '@/stores/ragPanelStore'
import { Search } from 'lucide-react'

interface DashboardHeaderProps {
  user: SupabaseUser | null
  onSignOut: () => void
}

function getUserDisplayName(user: SupabaseUser | null): string {
  if (!user) return ''
  return user.user_metadata?.user_name || user.email || ''
}

export function DashboardHeader({
  user,
  onSignOut,
}: DashboardHeaderProps) {
  const { isOpen, toggle } = useSidebarStore()
  const { isModified, selectedFilePath } = useEditorStore()
  const { isVisible: isRAGVisible, togglePanel } = useRAGPanelStore()

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent('editor:save'))
  }

  return (
    <header className="flex-shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between px-4 py-4">
        {/* 左側: ハンバーガーメニュー + ユーザー名 */}
        <div className="flex items-center gap-4">
          {/* ハンバーガーメニューボタン */}
          <button
            onClick={toggle}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            aria-label="Toggle sidebar"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* ユーザー名表示 */}
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {getUserDisplayName(user)}
          </p>
        </div>

        {/* 右側: Saveボタン + ログアウトボタン */}
        <div className="flex items-center gap-2">
          {/* Saveボタン */}
          {selectedFilePath && (
            <button
              onClick={handleSave}
              disabled={!isModified}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isModified
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title="Cmd+S / Ctrl+S"
            >
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save</span>
              <span className="hidden md:inline text-xs opacity-70">⌘S</span>
            </button>
          )}


          <button
            onClick={togglePanel}
            className={`
              flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors
              ${isRAGVisible
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            title="RAG Search"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline text-sm font-medium">RAG Search</span>
          </button>

          {/* ログアウトボタン（モバイルはアイコンのみ、デスクトップはフルボタン） */}
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 rounded-lg p-2 text-gray-900 transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 md:bg-gray-900 md:px-4 md:py-2 md:text-sm md:font-medium md:text-white md:hover:bg-gray-800 dark:md:bg-white dark:md:text-gray-900 dark:md:hover:bg-gray-100"
            aria-label="ログアウト"
          >
            <LogOut className="h-5 w-5 md:h-4 md:w-4" />
            <span className="hidden md:inline">ログアウト</span>
          </button>
        </div>
      </div>
    </header>
  )
}
