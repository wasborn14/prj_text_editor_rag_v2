import { useState, useLayoutEffect, RefObject } from 'react'

interface UseContextMenuPositionParams {
  x: number
  y: number
  isOpen: boolean
  menuRef: RefObject<HTMLElement>
}

interface Position {
  x: number
  y: number
}

/**
 * コンテキストメニューの位置調整を管理するカスタムフック
 * 画面外に出ないように位置を調整
 */
export function useContextMenuPosition({
  x,
  y,
  isOpen,
  menuRef,
}: UseContextMenuPositionParams): Position {
  const [adjustedPos, setAdjustedPos] = useState<Position>({ x, y })

  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return

    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let adjustedX = x
    let adjustedY = y

    // 右端を超える場合
    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10
    }

    // 下端を超える場合
    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10
    }

    setAdjustedPos({ x: adjustedX, y: adjustedY })
  }, [isOpen, x, y, menuRef])

  return adjustedPos
}
