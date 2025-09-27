'use client'

import React from 'react'
import { Icon, IconType } from '../Icon/Icon'

interface ToggleButtonProps {
  isActive: boolean
  onClick: () => void
  icon: IconType
  tooltip: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
}

const sizeClasses = {
  sm: 'p-1',
  md: 'p-2',
  lg: 'p-3'
}

const variantClasses = {
  default: {
    active: 'bg-blue-100 text-blue-700 border-blue-200',
    inactive: 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-700'
  },
  ghost: {
    active: 'bg-blue-100 text-blue-700',
    inactive: 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
  },
  outline: {
    active: 'bg-blue-50 text-blue-700 border-blue-200 border-2',
    inactive: 'text-gray-500 border-gray-200 border hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300'
  }
}

export function ToggleButton({
  isActive,
  onClick,
  icon,
  tooltip,
  className = '',
  size = 'sm',
  variant = 'default'
}: ToggleButtonProps) {
  const sizeClass = sizeClasses[size]
  const variantClass = variantClasses[variant]
  const stateClass = isActive ? variantClass.active : variantClass.inactive

  const baseClasses = `
    inline-flex items-center justify-center
    rounded transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
    ${sizeClass}
    ${stateClass}
    ${className}
  `.trim().replace(/\s+/g, ' ')

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClasses}
      title={tooltip}
      aria-label={tooltip}
      aria-pressed={isActive}
    >
      <Icon type={icon} size={size === 'lg' ? 'md' : 'sm'} />
    </button>
  )
}

// プリセット用コンポーネント
export function ViewModeToggle({
  currentMode,
  onModeChange,
  className = ''
}: {
  currentMode: 'tree' | 'list' | 'bookmarks'
  onModeChange: (mode: 'tree' | 'list' | 'bookmarks') => void
  className?: string
}) {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <ToggleButton
        isActive={currentMode === 'tree'}
        onClick={() => onModeChange('tree')}
        icon="tree-view"
        tooltip="Tree View (Ctrl+1)"
        variant="ghost"
      />
      <ToggleButton
        isActive={currentMode === 'list'}
        onClick={() => onModeChange('list')}
        icon="list"
        tooltip="List View (Ctrl+2)"
        variant="ghost"
      />
      <ToggleButton
        isActive={currentMode === 'bookmarks'}
        onClick={() => onModeChange('bookmarks')}
        icon="star"
        tooltip="Bookmarks (Ctrl+3)"
        variant="ghost"
      />
    </div>
  )
}

// サイドバー制御用ボタン
export function SidebarToggle({
  isVisible,
  onToggle,
  className = ''
}: {
  isVisible: boolean
  onToggle: () => void
  className?: string
}) {
  return (
    <ToggleButton
      isActive={isVisible} // 表示中はアクティブ状態
      onClick={onToggle}
      icon="menu" // 常にハンバーガーアイコン
      tooltip={isVisible ? 'Hide Sidebar (Ctrl+B)' : 'Show Sidebar (Ctrl+B)'}
      variant="ghost"
      className={className}
    />
  )
}