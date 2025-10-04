'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/atoms/Icon/Icon'

interface RenameInputProps {
  currentName: string
  type: 'file' | 'dir'
  onConfirm: (newName: string) => void
  onCancel: () => void
}

export function RenameInput({
  currentName,
  type,
  onConfirm,
  onCancel
}: RenameInputProps) {
  const [name, setName] = useState(currentName)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // 入力フォーカス時に拡張子以外を選択
    if (inputRef.current) {
      inputRef.current.focus()
      if (type === 'file' && currentName.includes('.')) {
        const dotIndex = currentName.lastIndexOf('.')
        inputRef.current.setSelectionRange(0, dotIndex)
      } else {
        inputRef.current.select()
      }
    }
  }, [currentName, type])

  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return 'Name cannot be empty'
    }

    // 不正な文字チェック
    if (/[<>:"/\\|?*\x00-\x1F]/.test(value)) {
      return 'Invalid characters in name'
    }

    // . or .. チェック
    if (value === '.' || value === '..') {
      return 'Invalid name'
    }

    return null
  }

  const handleConfirm = () => {
    const validationError = validateName(name)
    if (validationError) {
      setError(validationError)
      return
    }

    if (name === currentName) {
      onCancel()
      return
    }

    onConfirm(name)
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    setError(null)
  }

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-300 rounded">
      <div className="w-4 h-4 flex items-center justify-center">
        <Icon
          type={type === 'dir' ? 'folder' : 'file'}
          size="sm"
          className="text-gray-600"
        />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={name}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleConfirm}
        className={`flex-1 px-1 py-0.5 text-sm bg-white border rounded focus:outline-none focus:ring-1 ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
        }`}
        placeholder={type === 'dir' ? 'Folder name' : 'File name'}
      />
      {error && (
        <div className="absolute left-0 top-full mt-1 text-xs text-red-600 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  )
}
