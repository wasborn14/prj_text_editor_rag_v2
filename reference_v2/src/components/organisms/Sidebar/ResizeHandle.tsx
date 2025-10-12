'use client'

import React, { useRef, useCallback } from 'react'
import { useSidebarStore } from '@/stores/sidebarStore'

interface ResizeHandleProps {
  className?: string
}

export function ResizeHandle({ className = '' }: ResizeHandleProps) {
  const { width, setWidth } = useSidebarStore()
  const isDraggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = width

    // カーソルスタイルを変更
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return

      const deltaX = e.clientX - startXRef.current
      const newWidth = startWidthRef.current + deltaX

      // 最小・最大幅の制限
      const clampedWidth = Math.max(200, Math.min(600, newWidth))
      setWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [width, setWidth])

  return (
    <div
      className={`
        w-1 bg-gray-200 hover:bg-blue-400 cursor-ew-resize
        transition-colors duration-200 flex-shrink-0
        ${className}
      `}
      onMouseDown={handleMouseDown}
      title="Drag to resize sidebar"
    >
      {/* ハンドル部分の視覚的なインジケーター */}
      <div className="w-full h-full relative">
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-gray-300 hover:bg-blue-500" />
      </div>
    </div>
  )
}