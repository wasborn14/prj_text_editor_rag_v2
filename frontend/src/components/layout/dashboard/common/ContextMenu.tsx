import React, { useEffect, useRef } from 'react'
import { useContextMenuPosition } from '@/hooks/useContextMenuPosition'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  isOpen: boolean
  onClose: () => void
  items: ContextMenuItem[]
}

/**
 * 右クリック/長押しで表示されるコンテキストメニュー
 */
export function ContextMenu({ x, y, isOpen, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const adjustedPos = useContextMenuPosition({ x, y, isOpen, menuRef })

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* オーバーレイ（透明） */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* メニュー本体 */}
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[160px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
        style={{ left: adjustedPos.x, top: adjustedPos.y }}
      >
        {items.map((item, index) => {
          const handleClick = () => {
            if (!item.disabled) {
              item.onClick()
              onClose()
            }
          }

          return (
            <button
              key={index}
              onClick={handleClick}
              disabled={item.disabled}
              className={`
                w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors
                ${
                  item.disabled
                    ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
