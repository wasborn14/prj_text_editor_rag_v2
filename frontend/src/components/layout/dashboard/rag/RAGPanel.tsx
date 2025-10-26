'use client'

import React, { useState } from 'react'
import { X, Search, MessageCircle, RefreshCw, Maximize2, Minimize2 } from 'lucide-react'
import { RAGSearch } from './RAGSearch'
import { RAGChat } from './RAGChat'
import { RAGSync } from './RAGSync'
import { useRAGPanelStore } from '@/stores/ragPanelStore'
import { useThemeStore } from '@/stores/themeStore'

interface RAGPanelProps {
  repository?: string
}

export const RAGPanel = ({ repository }: RAGPanelProps) => {
  const { isVisible, width, activeTab, setVisible, setActiveTab, setWidth } = useRAGPanelStore()
  const { isDarkMode } = useThemeStore()
  const [isResizing, setIsResizing] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  const handleMaximize = () => {
    if (isMaximized) {
      setWidth(400) // デフォルトサイズに戻す
      setIsMaximized(false)
    } else {
      setWidth(800) // 最大サイズ
      setIsMaximized(true)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX
        setWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, setWidth])

  const tabs = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'sync', label: 'Sync', icon: RefreshCw }
  ] as const

  return (
    <div
      className={`fixed top-[72px] bottom-0 border-l border-gray-200 dark:border-gray-700 shadow-xl transition-transform duration-300 ease-in-out z-40 flex
                  ${isVisible ? 'translate-x-0' : 'translate-x-full'}
                  left-0 right-0 md:left-auto md:right-0`}
      style={{
        width: `min(100%, ${width}px)`,
        backgroundColor: isDarkMode ? '#202020' : 'white'
      }}
    >
      {/* Resize Handle - デスクトップのみ表示 */}
      <div
        className="hidden md:block w-1 hover:w-2 cursor-col-resize bg-gray-200 dark:bg-gray-600 hover:bg-blue-400 dark:hover:bg-blue-500 transition-all"
        onMouseDown={handleMouseDown}
      />

      {/* Panel Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-2
                      ${activeTab === tab.id
                        ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center space-x-1">
              {/* Maximize/Minimize - デスクトップのみ表示 */}
              <button
                onClick={handleMaximize}
                className="hidden md:block p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setVisible(false)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'search' && <RAGSearch repository={repository} />}
          {activeTab === 'chat' && <RAGChat repository={repository} />}
          {activeTab === 'sync' && <RAGSync repository={repository} />}
        </div>
      </div>
    </div>
  )
}
