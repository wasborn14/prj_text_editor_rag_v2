import React, { useState, useRef } from 'react'
import { UserCircle, Moon, Sun, LogOut } from 'lucide-react'
import { ContextMenu, ContextMenuItem } from './ContextMenu'

interface UserMenuProps {
  /** ダークモード状態 */
  isDarkMode: boolean
  /** ダークモード切り替え関数 */
  onToggleTheme: () => void
  /** ログアウト関数 */
  onSignOut: () => void
}

/**
 * ユーザーメニュー（ダークモード切り替え・ログアウト）
 */
export function UserMenu({
  isDarkMode,
  onToggleTheme,
  onSignOut,
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  const menuItems: ContextMenuItem[] = [
    {
      label: isDarkMode ? 'ライトモード' : 'ダークモード',
      icon: isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      onClick: () => {
        onToggleTheme()
      },
    },
    {
      label: 'ログアウト',
      icon: <LogOut className="h-4 w-4" />,
      onClick: () => {
        onSignOut()
      },
    },
  ]

  const handleClick = () => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const menuWidth = 160 // ContextMenuのmin-w-[160px]に合わせる

    // ヘッダーの高さを取得（トリガーボタンの親要素）
    const header = triggerRef.current.closest('header')
    const headerBottom = header ? header.getBoundingClientRect().bottom : rect.bottom

    setMenuPos({
      x: rect.right - menuWidth + 8, // 右端より少し内側（8px余白）
      y: headerBottom + 4,            // ヘッダーの真下に4px空けて表示
    })
    setIsOpen(!isOpen)
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleClick}
        className="rounded-full p-1.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        aria-label="ユーザーメニュー"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <UserCircle className="h-7 w-7" />
      </button>

      <ContextMenu
        x={menuPos.x}
        y={menuPos.y}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={menuItems}
      />
    </>
  )
}
