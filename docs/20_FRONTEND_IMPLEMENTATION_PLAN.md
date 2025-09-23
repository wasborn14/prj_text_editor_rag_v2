# Frontend実装プラン - RAGシステム

## 概要

reference_v1のSupabase認証実装を基盤として、RAGシステム専用のフロントエンドを構築する。既存のFastAPI（8001番ポート）と連携し、GitHub認証を通じてリポジトリベースのRAG検索・チャット機能を提供する。

## 技術スタック

### Core Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (認証・ユーザー管理)
- **Authentication**: Supabase Auth + GitHub OAuth
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Form Management**: React Hook Form + Zod
- **Styling**: Tailwind CSS + shadcn/ui

### Backend連携
- **RAG API**: 既存FastAPI (localhost:8001)
- **GitHub API**: Octokit (リポジトリ管理)

## 実装順序

### Phase 1: 認証・基盤機能 (Week 1)

#### 1.1 プロジェクトセットアップ
```bash
# Next.js プロジェクト作成
npx create-next-app@latest frontend --typescript --tailwind --app

# 必須パッケージインストール
npm install @supabase/ssr @supabase/supabase-js
npm install @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod
npm install @octokit/rest
npm install lucide-react clsx tailwind-merge

# 開発ツール
npm install --save-dev prettier eslint-config-prettier prettier-plugin-tailwindcss
```

#### 1.2 環境設定
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# 既存RAG API
NEXT_PUBLIC_RAG_API_URL=http://localhost:8001
NEXT_PUBLIC_RAG_API_KEY=4f5793c108119abe
```

#### 1.3 認証システム（reference_v1ベース + 改善）
```typescript
// lib/supabase.ts - 改善版
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/github.ts - RAG用に簡略化
import { Octokit } from '@octokit/rest'

export class GitHubClient {
  private octokit: Octokit

  constructor(accessToken: string) {
    this.octokit = new Octokit({ auth: accessToken })
  }

  async getUserRepos() {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 50, // RAG用途では50件で十分
      type: 'all',   // owner + collaborator
      visibility: 'public' // プライベートリポジトリは除外（RAG用途）
    })

    return data.map(repo => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      defaultBranch: repo.default_branch || 'main',
      updatedAt: repo.updated_at,
      language: repo.language,
      owner: repo.owner.login,
    }))
  }
}
```

#### 1.4 改善された認証プロバイダー
```typescript
// components/providers/AuthProvider.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  githubToken: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [githubToken, setGithubToken] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // 初期セッション取得
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      // GitHubトークン抽出
      if (session) {
        const token = session.provider_token || null
        setGithubToken(token)
      }

      setLoading(false)
    }

    getInitialSession()

    // 認証状態変化の監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      // GitHubトークン抽出
      const token = session?.provider_token || null
      setGithubToken(token)

      setLoading(false)

      // プロフィール作成（簡略化）
      if (event === 'SIGNED_IN' && session?.user) {
        await createProfile(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const createProfile = async (user: User) => {
    try {
      const supabase = createClient()

      const profile = {
        id: user.id,
        github_username: user.user_metadata?.user_name || null,
        display_name: user.user_metadata?.full_name || user.email || 'Unknown User',
        avatar_url: user.user_metadata?.avatar_url || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' })

      if (error) {
        console.error('Profile creation error:', error)
      }
    } catch (error) {
      console.error('Unexpected error in createProfile:', error)
    }
  }

  const signInWithGitHub = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/`,
        scopes: 'repo read:user user:email', // RAGに必要な最小権限
      },
    })

    if (error) {
      throw new Error(`GitHub authentication failed: ${error.message}`)
    }
  }

  const signOut = async () => {
    const supabase = createClient()

    // ローカル状態を即座にクリア
    setUser(null)
    setSession(null)
    setGithubToken(null)

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signInWithGitHub,
      signOut,
      githubToken,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
```

#### 1.5 基本レイアウト
```typescript
// components/organisms/Header/Header.tsx
import { useAuth } from '@/components/providers/AuthProvider'
import { Button } from '@/components/atoms/Button'
import { Avatar } from '@/components/atoms/Avatar'

export const Header = () => {
  const { user, loading, signInWithGitHub, signOut } = useAuth()

  if (loading) {
    return <div className="h-16 border-b flex items-center justify-between px-6">
      <h1 className="text-xl font-bold">RAG Documentation Search</h1>
      <div className="w-24 h-8 bg-gray-200 animate-pulse rounded" />
    </div>
  }

  return (
    <header className="h-16 border-b flex items-center justify-between px-6">
      <h1 className="text-xl font-bold">RAG Documentation Search</h1>

      {user ? (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Avatar
              src={user.user_metadata?.avatar_url}
              alt={user.user_metadata?.full_name || 'User'}
            />
            <span className="text-sm font-medium">
              {user.user_metadata?.full_name || user.email}
            </span>
          </div>
          <Button variant="ghost" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      ) : (
        <Button onClick={signInWithGitHub}>
          Sign in with GitHub
        </Button>
      )}
    </header>
  )
}
```

### Phase 2: リポジトリ管理・RAG連携 (Week 2)

#### 2.1 リポジトリ選択機能
```typescript
// stores/repository.store.ts
import { create } from 'zustand'

interface Repository {
  id: number
  name: string
  fullName: string
  description: string | null
  language: string | null
  owner: string
}

interface RepositoryState {
  repositories: Repository[]
  selectedRepository: Repository | null
  loading: boolean

  setRepositories: (repositories: Repository[]) => void
  setSelectedRepository: (repository: Repository | null) => void
  setLoading: (loading: boolean) => void
}

export const useRepositoryStore = create<RepositoryState>((set) => ({
  repositories: [],
  selectedRepository: null,
  loading: false,

  setRepositories: (repositories) => set({ repositories }),
  setSelectedRepository: (selectedRepository) => set({ selectedRepository }),
  setLoading: (loading) => set({ loading }),
}))

// hooks/useRepositories.ts
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/AuthProvider'
import { GitHubClient } from '@/lib/github'

export const useRepositories = () => {
  const { githubToken } = useAuth()

  return useQuery({
    queryKey: ['repositories', githubToken],
    queryFn: async () => {
      if (!githubToken) throw new Error('No GitHub token available')

      const github = new GitHubClient(githubToken)
      return github.getUserRepos()
    },
    enabled: !!githubToken,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  })
}
```

#### 2.2 RAG API連携
```typescript
// lib/api/rag-client.ts
class RAGClient {
  private baseURL: string
  private apiKey: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8001'
    this.apiKey = process.env.NEXT_PUBLIC_RAG_API_KEY || ''
  }

  async syncRepository(repositoryFullName: string) {
    const response = await fetch(`${this.baseURL}/api/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repository: repositoryFullName }),
    })

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`)
    }

    return response.json()
  }

  async search(query: string, repository: string) {
    const response = await fetch(`${this.baseURL}/api/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, repository }),
    })

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`)
    }

    return response.json()
  }

  async chat(message: string, repository: string) {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, repository }),
    })

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.statusText}`)
    }

    return response.json()
  }
}

export const ragClient = new RAGClient()

// hooks/useRAG.ts
import { useMutation, useQuery } from '@tanstack/react-query'
import { ragClient } from '@/lib/api/rag-client'

export const useRepositorySync = () => {
  return useMutation({
    mutationFn: (repositoryFullName: string) =>
      ragClient.syncRepository(repositoryFullName),
  })
}

export const useSearch = () => {
  return useMutation({
    mutationFn: ({ query, repository }: { query: string; repository: string }) =>
      ragClient.search(query, repository),
  })
}

export const useChat = () => {
  return useMutation({
    mutationFn: ({ message, repository }: { message: string; repository: string }) =>
      ragClient.chat(message, repository),
  })
}
```

### Phase 3: UI コンポーネント (Week 2後半〜Week 3)

#### 3.1 リポジトリ選択UI
```typescript
// components/organisms/RepositorySelector/RepositorySelector.tsx
import { useRepositories } from '@/hooks/useRepositories'
import { useRepositoryStore } from '@/stores/repository.store'
import { useRepositorySync } from '@/hooks/useRAG'

export const RepositorySelector = () => {
  const { data: repositories, isLoading } = useRepositories()
  const { selectedRepository, setSelectedRepository } = useRepositoryStore()
  const syncMutation = useRepositorySync()

  const handleRepositorySelect = async (repository: Repository) => {
    setSelectedRepository(repository)

    // 自動同期
    try {
      await syncMutation.mutateAsync(repository.fullName)
      // 成功通知
    } catch (error) {
      // エラーハンドリング
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Select Repository</h2>

      {isLoading ? (
        <div>Loading repositories...</div>
      ) : (
        <div className="grid gap-2">
          {repositories?.map((repo) => (
            <button
              key={repo.id}
              onClick={() => handleRepositorySelect(repo)}
              className={`p-3 border rounded-lg text-left hover:bg-gray-50 ${
                selectedRepository?.id === repo.id ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              <div className="font-medium">{repo.fullName}</div>
              {repo.description && (
                <div className="text-sm text-gray-600">{repo.description}</div>
              )}
              <div className="text-xs text-gray-500">{repo.language}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

## 改善点（reference_v1から）

### 1. **シンプル化**
- トークン修復機能を削除（複雑すぎる）
- プロフィール管理を最小限に
- エラーハンドリングを簡潔に

### 2. **RAG特化**
- GitHubクライアントをRAG用途に最適化
- リポジトリ権限を最小限（public推奨）
- 既存RAG APIとの連携に特化

### 3. **UX改善**
- 自動同期機能
- ローディング状態の改善
- エラー表示の統一

### 4. **パフォーマンス**
- TanStack Queryでキャッシュ最適化
- Zustandで軽量状態管理
- 必要最小限のAPI呼び出し

## デプロイ戦略

### 開発環境
- Docker + 既存バックエンド連携
- ホットリロード対応

### 本番環境
- Vercel（フロントエンド）
- VPS（RAG API）
- Supabase（認証・ユーザー管理）

この実装プランにより、reference_v1の良い部分を活用しつつ、RAGシステムに特化したシンプルで使いやすいフロントエンドを構築できます。