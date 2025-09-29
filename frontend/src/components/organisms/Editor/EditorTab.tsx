'use client'

import React from 'react'
import { Icon, getFileIconType } from '@/components/atoms/Icon/Icon'
import { EditorTab as EditorTabType } from '@/stores/editorStore'

interface EditorTabProps {
  tab: EditorTabType
  isActive: boolean
  onSelect: () => void
  onClose: () => void
  className?: string
}

export const EditorTab = ({
  tab,
  isActive,
  onSelect,
  onClose,
  className = ''
}: EditorTabProps) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  const handleMiddleClick = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle mouse button
      e.preventDefault()
      onClose()
    }
  }

  const tabClasses = `
    group flex items-center px-3 py-2 text-sm border-r border-gray-300
    cursor-pointer transition-colors min-w-[120px] max-w-[200px]
    ${isActive
      ? 'bg-white text-gray-900 border-t-2 border-t-blue-500'
      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
    }
    ${className}
  `.trim().replace(/\s+/g, ' ')

  return (
    <div
      className={tabClasses}
      onClick={onSelect}
      onMouseDown={handleMiddleClick}
      title={tab.path}
    >
      {/* Loading indicator */}
      {tab.isLoading && (
        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      )}

      {/* File icon */}
      {!tab.isLoading && (
        <div className="w-4 h-4 mr-2 flex-shrink-0">
          <Icon
            type={getFileIconType(tab.name)}
            size="sm"
            className="text-gray-600"
          />
        </div>
      )}

      {/* File name */}
      <span className="flex-1 truncate">
        {tab.name}
        {tab.isDirty && (
          <span className="ml-1 text-orange-500 font-bold">●</span>
        )}
      </span>

      {/* Close button */}
      <button
        onClick={handleClose}
        className={`
          ml-1 p-0.5 rounded hover:bg-gray-200 flex-shrink-0
          ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          transition-opacity
        `}
        title="Close tab (Ctrl+W)"
        aria-label={`Close ${tab.name}`}
      >
        <Icon
          type="x"
          size="xs"
          className="text-gray-500 hover:text-gray-700"
        />
      </button>
    </div>
  )
}