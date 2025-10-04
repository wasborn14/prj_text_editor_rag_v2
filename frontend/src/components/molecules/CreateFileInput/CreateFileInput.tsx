'use client'

import React, { useEffect, useRef, useState } from 'react'
import { File, Folder, X, AlertCircle } from 'lucide-react'

interface CreateFileInputProps {
  type: 'file' | 'folder'
  parentPath: string
  existingNames?: string[]
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function CreateFileInput({
  type,
  existingNames = [],
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

  // 重複チェック（リアルタイム）
  useEffect(() => {
    if (!value.trim()) {
      setError(null)
      return
    }

    let nameToCheck = value.trim()

    // ファイルの場合、拡張子がなければ.mdを自動追加してチェック
    if (type === 'file' && !/\.[^.]+$/.test(nameToCheck)) {
      nameToCheck = `${nameToCheck}.md`
    }

    // 大文字小文字を区別せずに重複チェック
    const isDuplicate = existingNames.some(
      name => name.toLowerCase() === nameToCheck.toLowerCase()
    )

    if (isDuplicate) {
      setError(`同じ名前の${type === 'file' ? 'ファイル' : 'フォルダ'}が既に存在します`)
    } else {
      setError(null)
    }
  }, [value, existingNames, type])

  // 基本的なバリデーション（空文字、禁止文字、長さチェック）
  const validate = (name: string): string | null => {
    if (!name.trim()) {
      return 'ファイル名を入力してください'
    }

    // 禁止文字チェック（パス区切り、特殊文字など）
    const invalidChars = /[/\\:*?"<>|]/
    if (invalidChars.test(name)) {
      return '使用できない文字が含まれています'
    }

    // ドットで始まるファイル名を禁止（.gitkeep以外）
    if (name.startsWith('.') && name !== '.gitkeep') {
      return 'ドットで始まるファイル名は作成できません'
    }

    // 長さチェック
    if (name.length > 255) {
      return 'ファイル名が長すぎます'
    }

    return null
  }

  const handleConfirm = () => {
    let trimmedValue = value.trim()

    // ファイルの場合、拡張子がなければ.mdを自動追加
    if (type === 'file') {
      const hasExtension = /\.[^.]+$/.test(trimmedValue)
      if (!hasExtension) {
        trimmedValue = `${trimmedValue}.md`
      }
    }

    // 基本的なバリデーション実行（重複チェックはuseEffectで実施済み）
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
    // フォーカスが外れたら自動的にキャンセル（100ms遅延でボタンクリックを許容）
    setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        onCancel()
      }
    }, 100)
  }

  return (
    <div className="relative px-3 py-1 bg-blue-50 border-l-2 border-blue-500">
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
          }}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={type === 'file' ? 'filename.ext' : 'folder-name'}
          className={`flex-1 px-2 py-0.5 text-sm border rounded focus:outline-none focus:ring-1 ${
            error
              ? 'border-red-400 focus:ring-red-500 focus:border-red-500'
              : 'border-blue-300 focus:ring-blue-500 focus:border-blue-500'
          }`}
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

      {/* VSCode風エラー表示 - inputの下に浮いた表示 */}
      {error && (
        <div className="absolute left-3 right-3 top-full mt-1 z-10 px-2 py-1.5 bg-red-50 border border-red-200 rounded shadow-md flex items-start space-x-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-red-700">{error}</span>
        </div>
      )}
    </div>
  )
}
