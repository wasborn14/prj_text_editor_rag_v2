import React, { useState, useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'

interface RenameInputProps {
  initialValue: string
  onConfirm: (newName: string) => void
  onCancel: () => void
  autoFocus?: boolean
  isMobile?: boolean
}

/**
 * インラインでファイル/ディレクトリ名を編集するコンポーネント
 */
export function RenameInput({
  initialValue,
  onConfirm,
  onCancel,
  autoFocus = true,
  isMobile = false,
}: RenameInputProps) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
      // ファイル名の拡張子を除いた部分を選択
      const lastDotIndex = initialValue.lastIndexOf('.')
      if (lastDotIndex > 0) {
        inputRef.current.setSelectionRange(0, lastDotIndex)
      } else {
        inputRef.current.select()
      }
    }
  }, [autoFocus, initialValue])

  const handleConfirm = () => {
    const trimmedValue = value.trim()
    if (trimmedValue && trimmedValue !== initialValue) {
      onConfirm(trimmedValue)
    } else {
      onCancel()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirm()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={isMobile ? undefined : handleConfirm}
        className="flex-1 min-w-0 px-1 -my-1 text-[15px] leading-[18px] bg-white dark:bg-gray-900 border border-blue-500 dark:border-blue-400 rounded outline-none"
        onClick={(e) => e.stopPropagation()}
      />

      {isMobile && (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleConfirm()
            }}
            className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
            type="button"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancel()
            }}
            className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
