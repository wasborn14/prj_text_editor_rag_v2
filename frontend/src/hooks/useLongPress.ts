import { useRef, useState, useEffect } from 'react'

interface UseLongPressOptions {
  onLongPress: (e: React.MouseEvent) => void
  delay?: number
  threshold?: number
}

interface UseLongPressReturn {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

/**
 * 長押し検出のカスタムフック
 * @param onLongPress - 長押し時に実行する関数
 * @param delay - 長押しと判定するまでの時間（ミリ秒）
 * @param threshold - 移動をキャンセルと判定する距離（ピクセル）
 */
export function useLongPress({
  onLongPress,
  delay = 500,
  threshold = 10,
}: UseLongPressOptions): UseLongPressReturn {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const touchStartPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }
    }
  }, [longPressTimer])

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPos.current = { x: touch.clientX, y: touch.clientY }

    const timer = setTimeout(() => {
      if (touchStartPos.current) {
        const syntheticEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          clientX: touchStartPos.current.x,
          clientY: touchStartPos.current.y,
        } as React.MouseEvent
        onLongPress(syntheticEvent)
      }
    }, delay)

    setLongPressTimer(timer)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return

    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartPos.current.x)
    const dy = Math.abs(touch.clientY - touchStartPos.current.y)

    // threshold以上動いたらキャンセル
    if (dx > threshold || dy > threshold) {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        setLongPressTimer(null)
      }
      touchStartPos.current = null
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    touchStartPos.current = null
  }

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
