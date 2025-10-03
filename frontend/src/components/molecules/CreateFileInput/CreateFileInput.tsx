'use client'

import React, { useEffect, useRef, useState } from 'react'
import { File, Folder, X } from 'lucide-react'

interface CreateFileInputProps {
  type: 'file' | 'folder'
  parentPath: string
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function CreateFileInput({
  type,
  onConfirm,
  onCancel
}: CreateFileInputProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 自動フォーカス
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // バリデーション
  const validate = (name: string): string | null => {
    if (!name.trim()) {
      return 'Name cannot be empty'
    }

    // 禁止文字チェック
    const invalidChars = /[/\\:*?"<>|]/
    if (invalidChars.test(name)) {
      return 'Name contains invalid characters'
    }

    // ドットで始まるファイル名を禁止（.gitkeep以外）
    if (name.startsWith('.') && name !== '.gitkeep') {
      return 'Name cannot start with dot'
    }

    // 長さチェック
    if (name.length > 255) {
      return 'Name is too long'
    }

    return null
  }

  const handleConfirm = () => {
    const trimmedValue = value.trim()
    const validationError = validate(trimmedValue)

    if (validationError) {
      setError(validationError)
      return
    }

    onConfirm(trimmedValue)
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

  const handleBlur = () => {
    // フォーカスが外れたらキャンセル（少し遅延を入れる）
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        onCancel()
      }
    }, 100)
  }

  return (
    <div className="px-3 py-1 bg-blue-50 border-l-2 border-blue-500">
      <div className="flex items-center space-x-2">
        {/* アイコン */}
        {type === 'file' ? (
          <File className="w-4 h-4 text-blue-600 flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-blue-600 flex-shrink-0" />
        )}

        {/* 入力フィールド */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={type === 'file' ? 'filename.ext' : 'folder-name'}
          className="flex-1 px-2 py-0.5 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />

        {/* キャンセルボタン */}
        <button
          onClick={onCancel}
          className="p-0.5 rounded hover:bg-blue-100"
          title="Cancel"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mt-1 text-xs text-red-600 ml-6">
          {error}
        </div>
      )}
    </div>
  )
}
