'use client'

import { useState } from 'react'
import { X, Info, ExternalLink } from 'lucide-react'

interface TokenSetupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (token: string, expiresAt: string | null) => Promise<void>
}

export default function TokenSetupModal({
  isOpen,
  onClose,
  onSave,
}: TokenSetupModalProps) {
  const [token, setToken] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSave = async () => {
    if (!token.trim()) {
      setError('トークンを入力してください')
      return
    }

    if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
      setError('有効なGitHub Personal Access Tokenを入力してください')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await onSave(token, expiresAt || null)
      setToken('')
      setExpiresAt('')
    } catch (err) {
      setError('トークンの保存に失敗しました')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            GitHub Personal Access Tokenの設定
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Info Alert */}
        <div className="mb-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <div className="flex gap-3">
            <Info className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <p className="font-medium">初回ログイン時の設定が必要です</p>
              <p className="mt-1 text-blue-700 dark:text-blue-300">
                GitHubリポジトリにアクセスするため、Personal Access
                Tokenを入力してください。
              </p>
            </div>
          </div>
        </div>

        {/* Token Input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            GitHub Personal Access Token
            <span className="ml-1 text-red-500">*</span>
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            トークンは暗号化されてデータベースに保存されます
          </p>
        </div>

        {/* Expiration Date Input */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">
            有効期限（任意）
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            期限が近づくと通知されます（未入力の場合は通知なし）
          </p>
        </div>

        {/* Token Creation Guide */}
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
            トークンの作成方法
          </h3>
          <ol className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <li>
              1.{' '}
              <a
                href="https://github.com/settings/tokens?type=beta"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
              >
                GitHub Settings → Personal access tokens
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>2. 「Generate new token」をクリック</li>
            <li>3. 「Fine-grained tokens」を選択（推奨）</li>
            <li>4. 必要な権限を設定:</li>
            <li className="ml-4">- Repository access: All repositories または選択</li>
            <li className="ml-4">- Permissions: Contents (Read and write)</li>
            <li>5. 「Generate token」をクリック</li>
            <li>6. 表示されたトークンをコピーして上記に貼り付け</li>
          </ol>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存して開始'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            後で設定
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          トークンは後から設定画面で変更できます
        </p>
      </div>
    </div>
  )
}
