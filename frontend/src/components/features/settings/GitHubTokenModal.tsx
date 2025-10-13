'use client'

import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/stores/authStore'
import { ExternalLink, AlertCircle, Loader2 } from 'lucide-react'

interface GitHubTokenModalProps {
  isOpen: boolean
  reason: 'missing' | 'expired' | 'invalid' | null
}

interface TokenFormData {
  token: string
  expiresAt?: string
}

const MESSAGES = {
  missing: {
    title: 'GitHubトークンの設定が必要です',
    description:
      'リポジトリにアクセスするためにGitHub Personal Access Tokenを設定してください。',
  },
  expired: {
    title: 'GitHubトークンの有効期限が切れています',
    description:
      'トークンの有効期限が切れました。新しいトークンを設定してください。',
  },
  invalid: {
    title: 'GitHubトークンが無効です',
    description:
      'トークンが取り消されたか、権限が不足しています。新しいトークンを設定してください。',
  },
}

export function GitHubTokenModal({ isOpen, reason }: GitHubTokenModalProps) {
  const saveGithubToken = useAuthStore((state) => state.saveGithubToken)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useForm<TokenFormData>()

  if (!isOpen || !reason) return null

  const message = MESSAGES[reason]

  const onSubmit = async (data: TokenFormData) => {
    try {
      // 有効期限が設定されている場合はISO形式に変換
      const expiresAtISO = data.expiresAt
        ? new Date(data.expiresAt).toISOString()
        : null

      await saveGithubToken(data.token, expiresAtISO)
      reset()
    } catch (err) {
      setError('root', {
        message:
          err instanceof Error
            ? err.message
            : 'トークンの保存に失敗しました。トークンが有効か確認してください。',
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {message.title}
              </h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {message.description}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* トークン作成ガイド */}
            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                トークンの作成方法
              </h3>
              <ol className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-400">
                <li>1. GitHubの Settings → Developer settings へ移動</li>
                <li>2. Personal access tokens → Tokens (classic) を選択</li>
                <li>
                  3. Generate new token (classic) をクリック
                </li>
                <li>
                  4. 必要な権限を選択:
                  <span className="ml-1 font-mono font-semibold">repo</span>,
                  <span className="ml-1 font-mono font-semibold">
                    read:user
                  </span>
                </li>
                <li>5. トークンをコピーして下記に貼り付け</li>
              </ol>
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                GitHubでトークンを作成
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* トークン入力 */}
            <div>
              <label
                htmlFor="github-token"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                GitHub Personal Access Token
              </label>
              <input
                id="github-token"
                type="password"
                {...register('token', {
                  required: 'トークンを入力してください',
                  validate: (value) => {
                    if (
                      !value.startsWith('ghp_') &&
                      !value.startsWith('github_pat_')
                    ) {
                      return 'トークンの形式が正しくありません。ghp_ または github_pat_ で始まる必要があります。'
                    }
                    return true
                  },
                })}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                disabled={isSubmitting}
              />
              {errors.token && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.token.message}
                </p>
              )}
            </div>

            {/* 有効期限入力 */}
            <div>
              <label
                htmlFor="expires-at"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                有効期限（オプション）
              </label>
              <input
                id="expires-at"
                type="date"
                {...register('expiresAt')}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Fine-grained tokenの場合は有効期限を設定してください。Classic tokenの場合は空欄で構いません。
              </p>
            </div>

            {/* エラー表示 */}
            {errors.root && (
              <div className="flex items-start gap-2 rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-800 dark:text-red-300">
                  {errors.root.message}
                </p>
              </div>
            )}

            {/* ボタン */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? '検証中...' : 'トークンを保存'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
