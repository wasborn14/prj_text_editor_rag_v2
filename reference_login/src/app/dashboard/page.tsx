'use client'

import { useAuthStore } from '@/stores/authStore'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GitHubClient, Repository, FileTreeItem } from '@/lib/github'
import { createClient } from '@/lib/supabase'
import TokenSetupModal from '@/components/TokenSetupModal'
import {
  LogOut,
  FolderOpen,
  File,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const { user, githubToken, signOut, loading, session, saveGithubToken } = useAuthStore()
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([])
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [repoLoading, setRepoLoading] = useState(true)
  const [treeLoading, setTreeLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenInfo, setTokenInfo] = useState<{
    expiresAt: Date | null
    hasRefreshToken: boolean
    timeRemaining: string
  } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showTokenSetup, setShowTokenSetup] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // 初回ログイン時: トークンが未設定の場合、モーダルを表示
  useEffect(() => {
    if (user && !loading && !githubToken) {
      setShowTokenSetup(true)
    }
  }, [user, loading, githubToken])

  // リポジトリ一覧を取得
  useEffect(() => {
    const fetchRepositories = async () => {
      if (!githubToken) {
        setError('GitHubトークンが取得できませんでした')
        setRepoLoading(false)
        return
      }

      try {
        const client = new GitHubClient(githubToken)
        const repos = await client.getRepositories()
        setRepositories(repos)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch repositories:', err)
        setError(
          'リポジトリの取得に失敗しました。トークンの有効期限が切れている可能性があります。'
        )
      } finally {
        setRepoLoading(false)
      }
    }

    if (user && githubToken) {
      fetchRepositories()
    }
  }, [user, githubToken])

  // 選択したリポジトリのファイルツリーを取得
  useEffect(() => {
    const fetchFileTree = async () => {
      console.log('📋 File tree fetch triggered:', {
        selectedRepo: selectedRepo?.full_name,
        hasGithubToken: !!githubToken,
        githubTokenLength: githubToken?.length,
      })

      if (!selectedRepo || !githubToken) {
        console.log('   ⏭️  Skipping fetch (no repo or token)')
        return
      }

      setTreeLoading(true)
      console.log(`   🔄 Fetching file tree for: ${selectedRepo.full_name}`)

      try {
        const client = new GitHubClient(githubToken)
        const [owner, repo] = selectedRepo.full_name.split('/')
        const tree = await client.getRepositoryTree(owner, repo)
        setFileTree(tree)
        setError(null)
        console.log(`   ✅ File tree updated: ${tree.length} items`)
      } catch (err) {
        console.error('   ❌ Failed to fetch file tree:', err)
        setError('ファイルツリーの取得に失敗しました')
        setFileTree([])
      } finally {
        setTreeLoading(false)
      }
    }

    fetchFileTree()
  }, [selectedRepo, githubToken])

  // トークン情報を更新
  useEffect(() => {
    const updateTokenInfo = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        const expiresAt = new Date(session.expires_at! * 1000)
        const now = new Date()
        const diffMs = expiresAt.getTime() - now.getTime()
        const diffMinutes = Math.floor(diffMs / 1000 / 60)

        setTokenInfo({
          expiresAt,
          hasRefreshToken: !!session.refresh_token,
          timeRemaining:
            diffMinutes > 0
              ? `${diffMinutes}分`
              : `期限切れ（${Math.abs(diffMinutes)}分前）`,
        })
      }
    }

    updateTokenInfo()
    const interval = setInterval(updateTokenInfo, 10000) // 10秒ごとに更新

    return () => clearInterval(interval)
  }, [session])

  const handleRefreshToken = async () => {
    setRefreshing(true)
    const supabase = createClient()

    console.log('🔄 Manual token refresh started...')
    console.log('Current time:', new Date().toISOString())

    const { data: beforeSession } = await supabase.auth.getSession()
    console.log(
      'Token expires at (before):',
      new Date(beforeSession.session?.expires_at! * 1000).toISOString()
    )

    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      console.error('❌ Refresh failed:', error)
      setError('トークンのリフレッシュに失敗しました')
    } else {
      const newGithubToken = data.session?.provider_token
      console.log('✅ Refresh success!')
      console.log(
        'New token expires at:',
        new Date(data.session?.expires_at! * 1000).toISOString()
      )
      console.log('Has refresh_token:', !!data.session?.refresh_token)
      console.log('GitHub provider_token:', newGithubToken ? `${newGithubToken.substring(0, 10)}...` : 'null')
      console.log('Current githubToken from store:', githubToken ? `${githubToken.substring(0, 10)}...` : 'null')

      // トークン情報を即座に更新
      const expiresAt = new Date(data.session?.expires_at! * 1000)
      const now = new Date()
      const diffMs = expiresAt.getTime() - now.getTime()
      const diffMinutes = Math.floor(diffMs / 1000 / 60)

      setTokenInfo({
        expiresAt,
        hasRefreshToken: !!data.session?.refresh_token,
        timeRemaining: `${diffMinutes}分`,
      })
    }

    setRefreshing(false)
  }

  const handleExpireToken = async (minutes: number) => {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()

    if (data.session) {
      console.log(`⏰ Setting token to expire in ${minutes} minute(s)...`)
      console.log('Current time:', new Date().toISOString())

      // 有効期限を現在時刻 + 指定分後に設定
      const newExpiresAt = Math.floor(Date.now() / 1000) + minutes * 60

      // Cookieを直接更新するため、setSessionを使用
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token!,
      })

      // 強制的にexpires_atを書き換え（開発用ハック）
      const modifiedSession = {
        ...data.session,
        expires_at: newExpiresAt,
      }

      // Local storageやCookieを直接操作
      console.log(
        `✅ Token will expire at: ${new Date(newExpiresAt * 1000).toISOString()}`
      )
      console.log(`⏱️ Automatic refresh should trigger in ${minutes} minute(s)`)
      console.log(
        '💡 Watch the console for: "Session refreshed automatically at: ..."'
      )

      // トークン情報を即座に更新
      setTokenInfo({
        expiresAt: new Date(newExpiresAt * 1000),
        hasRefreshToken: !!data.session.refresh_token,
        timeRemaining: `${minutes}分`,
      })
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  const handleSaveToken = async (token: string, expiresAt: string | null) => {
    await saveGithubToken(token, expiresAt)
    setShowTokenSetup(false)
    // トークン保存後、リポジトリ一覧を再取得
    setRepoLoading(true)
  }

  const handleRepoChange = (repoFullName: string) => {
    const repo = repositories.find((r) => r.full_name === repoFullName)
    setSelectedRepo(repo || null)
    setExpandedDirs(new Set())
  }

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedDirs(newExpanded)
  }

  // ファイルツリーを階層構造に変換
  const buildFileTree = () => {
    const root: { [key: string]: any } = {}

    fileTree.forEach((item) => {
      const parts = item.path.split('/')
      let current = root

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            fullPath: parts.slice(0, index + 1).join('/'),
            type: index === parts.length - 1 ? item.type : 'dir',
            children: {},
          }
        }
        current = current[part].children
      })
    })

    return root
  }

  const renderTree = (node: any, level = 0) => {
    const entries = Object.entries(node)
    if (entries.length === 0) return null

    return (
      <div className="space-y-0.5">
        {entries.map(([key, value]: [string, any]) => {
          const isDir = value.type === 'dir'
          const isExpanded = expandedDirs.has(value.fullPath)

          return (
            <div key={value.fullPath}>
              <button
                onClick={() => isDir && toggleDirectory(value.fullPath)}
                className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                style={{ paddingLeft: `${level * 16 + 8}px` }}
              >
                {isDir ? (
                  <>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <FolderOpen className="h-4 w-4 text-blue-500" />
                  </>
                ) : (
                  <>
                    <span className="w-4" />
                    <File className="h-4 w-4 text-gray-400" />
                  </>
                )}
                <span className="truncate text-gray-900 dark:text-gray-100">
                  {value.name}
                </span>
              </button>
              {isDir && isExpanded && renderTree(value.children, level + 1)}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <TokenSetupModal
        isOpen={showTokenSetup}
        onClose={() => setShowTokenSetup(false)}
        onSave={handleSaveToken}
      />
      <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user.user_metadata?.user_name || user.email}
                </p>
              </div>

              {/* Repository Selector */}
              {!repoLoading && repositories.length > 0 && (
                <div className="ml-8">
                  <select
                    value={selectedRepo?.full_name || ''}
                    onChange={(e) => handleRepoChange(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">リポジトリを選択...</option>
                    {repositories.map((repo) => (
                      <option key={repo.id} value={repo.full_name}>
                        {repo.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Token Info & Actions */}
            <div className="flex items-center gap-3">
              {tokenInfo && (
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs dark:bg-blue-900/20">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium text-blue-900 dark:text-blue-200">
                      残り: {tokenInfo.timeRemaining}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400">
                      {tokenInfo.hasRefreshToken ? '✓ リフレッシュ可能' : '✗ リフレッシュ不可'}
                    </div>
                  </div>
                </div>
              )}

              {/* Expire Token Buttons (開発用) */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleExpireToken(1)}
                  className="rounded-lg bg-yellow-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-yellow-700"
                  title="トークンを1分後に期限切れに設定"
                >
                  1分で期限切れ
                </button>
                <button
                  onClick={() => handleExpireToken(0.5)}
                  className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-700"
                  title="トークンを30秒後に期限切れに設定"
                >
                  30秒で期限切れ
                </button>
              </div>

              <button
                onClick={handleRefreshToken}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                トークン更新
              </button>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  エラーが発生しました
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        <div className="mx-auto flex w-full max-w-7xl flex-1 gap-4 px-4 py-6 sm:px-6 lg:px-8">
          {/* File Tree Panel */}
          <div className="w-80 flex-shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
              ファイル一覧
            </h2>

            {!selectedRepo && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                リポジトリを選択してください
              </p>
            )}

            {selectedRepo && treeLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                読み込み中...
              </div>
            )}

            {selectedRepo && !treeLoading && fileTree.length > 0 && (
              <div className="text-sm">{renderTree(buildFileTree())}</div>
            )}

            {selectedRepo && !treeLoading && fileTree.length === 0 && !error && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                ファイルが見つかりませんでした
              </p>
            )}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            {!selectedRepo && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
                    リポジトリを選択してください
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    上部のドロップダウンからリポジトリを選択すると、ファイルツリーが表示されます
                  </p>
                </div>
              </div>
            )}

            {selectedRepo && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedRepo.full_name}
                </h3>
                {selectedRepo.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedRepo.description}
                  </p>
                )}
                <div className="mt-4 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {selectedRepo.language && <span>{selectedRepo.language}</span>}
                  <span>⭐ {selectedRepo.stargazers_count}</span>
                  <span>
                    更新:{' '}
                    {new Date(selectedRepo.updated_at).toLocaleDateString(
                      'ja-JP'
                    )}
                  </span>
                </div>
                <div className="mt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ファイル総数: {fileTree.length}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </>
  )
}
