# Frontend Architecture & Development Guidelines

## プロジェクト概要

### 目的
RAGシステムのWebフロントエンドを構築し、現在のCLIベースの操作を直感的なUIで提供する

### 技術スタック
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand or TanStack Query
- **API Communication**: Fetch API + Custom Hooks
- **Development**: Docker (local only)
- **Deployment**: Vercel (production)

## アーキテクチャ方針

### 1. ディレクトリ構造

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 認証が必要なルート
│   │   │   ├── dashboard/
│   │   │   ├── search/
│   │   │   └── chat/
│   │   ├── api/                # API Routes (BFF)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/             # Atomic Design構造
│   │   ├── atoms/             # 最小単位のUI部品
│   │   ├── molecules/         # Atomsの組み合わせ
│   │   ├── organisms/         # 複雑な機能コンポーネント
│   │   ├── templates/         # ページレイアウト
│   │   └── pages/            # 実際のページコンポーネント
│   │
│   ├── lib/                    # ユーティリティ
│   │   ├── api/               # API クライアント
│   │   ├── hooks/             # Custom Hooks
│   │   ├── utils/             # ヘルパー関数
│   │   └── constants/         # 定数定義
│   │
│   ├── stores/                # 状態管理 (Zustand)
│   │   ├── auth.store.ts
│   │   ├── chat.store.ts
│   │   └── search.store.ts
│   │
│   └── types/                 # TypeScript型定義
│       ├── api.types.ts
│       ├── ui.types.ts
│       └── domain.types.ts
│
├── public/                    # 静的ファイル
├── tests/                     # テストファイル
├── .env.local                 # 環境変数
├── .dockerignore
├── Dockerfile
├── Dockerfile.dev
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

### 2. コンポーネント設計

#### Atomic Design の採用

標準的な5階層のAtomic Designパターンを採用します：

```
components/
├── atoms/              # 最小単位のUI部品
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
│   ├── Input/
│   │   ├── Input.tsx
│   │   └── index.ts
│   ├── Badge/
│   ├── Icon/
│   └── Text/
│
├── molecules/          # Atomsを組み合わせた小規模コンポーネント
│   ├── SearchBar/
│   │   ├── SearchBar.tsx
│   │   └── index.ts
│   ├── ChatMessage/
│   │   ├── ChatMessage.tsx
│   │   └── index.ts
│   ├── FileCard/
│   ├── RepositoryCard/
│   └── UserAvatar/
│
├── organisms/          # 複雑な機能を持つコンポーネント
│   ├── ChatInterface/
│   │   ├── ChatInterface.tsx
│   │   ├── ChatHistory.tsx
│   │   └── index.ts
│   ├── SearchResults/
│   │   ├── SearchResults.tsx
│   │   ├── ResultItem.tsx
│   │   └── index.ts
│   ├── RepositorySelector/
│   ├── NavigationMenu/
│   └── FilterPanel/
│
├── templates/          # ページレイアウトのテンプレート
│   ├── DashboardTemplate/
│   │   ├── DashboardTemplate.tsx
│   │   └── index.ts
│   ├── ChatTemplate/
│   ├── SearchTemplate/
│   └── SettingsTemplate/
│
└── pages/             # 実際のページコンポーネント
    ├── Dashboard/
    │   ├── Dashboard.tsx
    │   └── index.ts
    ├── Chat/
    ├── Search/
    └── Settings/
```

#### コンポーネント実装例

```typescript
// components/atoms/Button/Button.tsx
import { cn } from "@/lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        // variant styles
        {
          'primary': 'bg-blue-600 text-white hover:bg-blue-700',
          'secondary': 'bg-gray-200 text-gray-900 hover:bg-gray-300',
          'ghost': 'hover:bg-gray-100'
        }[variant],
        // size styles
        {
          'sm': 'px-3 py-1.5 text-sm',
          'md': 'px-4 py-2',
          'lg': 'px-6 py-3 text-lg'
        }[size],
        className
      )}
      {...props}
    />
  )
}
```

```typescript
// components/molecules/SearchBar/SearchBar.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Search } from 'lucide-react'

// バリデーションスキーマ
const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Query too long')
})

type SearchFormData = z.infer<typeof searchSchema>

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  isLoading?: boolean
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search documentation...",
  isLoading = false
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
    mode: 'onChange'
  })

  const onSubmit = (data: SearchFormData) => {
    onSearch(data.query)
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
      <div className="flex gap-2">
        <Input
          {...register('query')}
          placeholder={placeholder}
          icon={<Search className="w-4 h-4" />}
          error={errors.query?.message}
        />
        <Button
          type="submit"
          disabled={isLoading || !isValid}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </Button>
      </div>
      {errors.query && (
        <p className="text-sm text-red-500">{errors.query.message}</p>
      )}
    </form>
  )
}
```

```typescript
// components/organisms/SearchResults/SearchResults.tsx
import { FileCard } from '@/components/molecules/FileCard'
import { SearchResult } from '@/types/api.types'

interface SearchResultsProps {
  results: SearchResult[]
  query: string
  isLoading: boolean
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  isLoading
}) => {
  if (isLoading) {
    return <SearchResultsSkeleton />
  }

  if (!results.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        No results found for "{query}"
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((result, index) => (
        <FileCard
          key={`${result.metadata.sha}-${index}`}
          title={result.metadata.name}
          path={result.metadata.path}
          content={result.content}
          score={result.metadata.score}
        />
      ))}
    </div>
  )
}
```

```typescript
// components/templates/SearchTemplate/SearchTemplate.tsx
import { SearchBar } from '@/components/molecules/SearchBar'
import { SearchResults } from '@/components/organisms/SearchResults'
import { FilterPanel } from '@/components/organisms/FilterPanel'

interface SearchTemplateProps {
  children?: React.ReactNode
}

export const SearchTemplate: React.FC<SearchTemplateProps> = ({ children }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <FilterPanel />
        </aside>
        <main className="lg:col-span-3">
          {children}
        </main>
      </div>
    </div>
  )
}
```

```typescript
// components/pages/Search/Search.tsx
'use client'

import { SearchTemplate } from '@/components/templates/SearchTemplate'
import { SearchBar } from '@/components/molecules/SearchBar'
import { SearchResults } from '@/components/organisms/SearchResults'
import { useSearch } from '@/lib/hooks/useSearch'

export const SearchPage: React.FC = () => {
  const { results, isLoading, query, search } = useSearch()

  return (
    <SearchTemplate>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Search Documentation</h1>
        <SearchBar onSearch={search} isLoading={isLoading} />
        <SearchResults
          results={results}
          query={query}
          isLoading={isLoading}
        />
      </div>
    </SearchTemplate>
  )
}
```

#### 複雑なフォームの例 (React Hook Form + Zod)

```typescript
// components/organisms/RepositoryForm/RepositoryForm.tsx
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Switch } from '@/components/atoms/Switch'

// 複雑なバリデーションスキーマ
const repositorySchema = z.object({
  repository: z.string()
    .min(1, 'Repository is required')
    .regex(/^[\w-]+\/[\w-]+$/, 'Format: owner/repo'),
  syncMode: z.enum(['full', 'incremental', 'manual']),
  autoSync: z.boolean(),
  syncInterval: z.number().min(60).max(86400).optional(),
  filters: z.object({
    fileTypes: z.array(z.string()).min(1, 'Select at least one file type'),
    directories: z.array(z.string()).optional(),
    excludePatterns: z.string().optional()
  })
}).refine(
  (data) => {
    if (data.autoSync && !data.syncInterval) {
      return false
    }
    return true
  },
  {
    message: 'Sync interval is required when auto-sync is enabled',
    path: ['syncInterval']
  }
)

type RepositoryFormData = z.infer<typeof repositorySchema>

interface RepositoryFormProps {
  onSubmit: (data: RepositoryFormData) => Promise<void>
  defaultValues?: Partial<RepositoryFormData>
}

export const RepositoryForm: React.FC<RepositoryFormProps> = ({
  onSubmit,
  defaultValues
}) => {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<RepositoryFormData>({
    resolver: zodResolver(repositorySchema),
    defaultValues: {
      syncMode: 'full',
      autoSync: false,
      filters: {
        fileTypes: ['.md']
      },
      ...defaultValues
    }
  })

  const autoSync = watch('autoSync')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Repository Input */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Repository
        </label>
        <Input
          {...register('repository')}
          placeholder="owner/repository"
          error={errors.repository?.message}
        />
      </div>

      {/* Sync Mode Select */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Sync Mode
        </label>
        <Controller
          name="syncMode"
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              options={[
                { value: 'full', label: 'Full Sync' },
                { value: 'incremental', label: 'Incremental' },
                { value: 'manual', label: 'Manual' }
              ]}
              error={errors.syncMode?.message}
            />
          )}
        />
      </div>

      {/* Auto Sync Toggle */}
      <div className="flex items-center gap-3">
        <Controller
          name="autoSync"
          control={control}
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <label className="text-sm font-medium">
          Enable Auto Sync
        </label>
      </div>

      {/* Conditional Sync Interval */}
      {autoSync && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Sync Interval (seconds)
          </label>
          <Input
            {...register('syncInterval', { valueAsNumber: true })}
            type="number"
            min={60}
            max={86400}
            error={errors.syncInterval?.message}
          />
        </div>
      )}

      {/* File Types Multi-Select */}
      <div>
        <label className="block text-sm font-medium mb-2">
          File Types
        </label>
        <Controller
          name="filters.fileTypes"
          control={control}
          render={({ field }) => (
            <MultiSelect
              {...field}
              options={[
                { value: '.md', label: 'Markdown' },
                { value: '.mdx', label: 'MDX' },
                { value: '.txt', label: 'Text' },
                { value: '.rst', label: 'reStructuredText' }
              ]}
              error={errors.filters?.fileTypes?.message}
            />
          )}
        />
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="w-full"
      >
        {isSubmitting ? 'Syncing...' : 'Start Sync'}
      </Button>
    </form>
  )
}
```

### 3. 状態管理

#### Zustand を採用

```typescript
// stores/search.store.ts
import { create } from 'zustand'
import { SearchResult } from '@/types/api.types'

interface SearchState {
  results: SearchResult[]
  isLoading: boolean
  error: string | null
  query: string

  setResults: (results: SearchResult[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setQuery: (query: string) => void
  clearResults: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  results: [],
  isLoading: false,
  error: null,
  query: '',

  setResults: (results) => set({ results }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setQuery: (query) => set({ query }),
  clearResults: () => set({ results: [], error: null })
}))
```

#### TanStack Query でデータフェッチング

```typescript
// lib/hooks/useSearch.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { searchAPI } from '@/lib/api/search'
import { useSearchStore } from '@/stores/search.store'

export function useSearch() {
  const queryClient = useQueryClient()
  const { setResults, setError } = useSearchStore()

  return useMutation({
    mutationFn: ({ query, repository }: { query: string; repository: string }) =>
      searchAPI.search(query, repository),
    onSuccess: (data) => {
      setResults(data.results)
      queryClient.invalidateQueries({ queryKey: ['search-history'] })
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })
}
```

### 4. API層の設計

```typescript
// lib/api/client.ts
class APIClient {
  private baseURL: string
  private apiKey: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
    this.apiKey = process.env.NEXT_PUBLIC_API_KEY || ''
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new APIClient()
```

```typescript
// lib/api/search.ts
import { apiClient } from './client'
import { SearchRequest, SearchResponse } from '@/types/api.types'

export const searchAPI = {
  search: (query: string, repository: string) =>
    apiClient.post<SearchResponse>('/api/search', { query, repository }),

  getHistory: () =>
    apiClient.get<SearchResponse[]>('/api/search/history'),
}
```

### 5. UI ライブラリ選定

#### 採用するライブラリ

| カテゴリ | ライブラリ | 理由 |
|---------|-----------|------|
| **UIコンポーネント** | shadcn/ui | カスタマイズ性、コピペ可能、Tailwind統合 |
| **スタイリング** | Tailwind CSS | 開発速度、一貫性、パフォーマンス |
| **アイコン** | Lucide React | 軽量、Tree-shaking対応 |
| **フォーム** | React Hook Form + Zod | バリデーション、TypeScript統合 |
| **テーブル** | TanStack Table | 高機能、カスタマイズ性 |
| **チャート** | Recharts | シンプル、React親和性 |
| **トースト通知** | Sonner | 軽量、美しいアニメーション |
| **モーダル** | Radix UI Dialog | アクセシビリティ、shadcn/ui統合 |
| **日付選択** | React Day Picker | 軽量、カスタマイズ性 |
| **コード表示** | Prism.js or Shiki | シンタックスハイライト |
| **Markdown** | react-markdown + remark | 拡張性、安全性 |

#### インストールコマンド

```bash
# 基本パッケージ
npm install @tanstack/react-query zustand clsx tailwind-merge
npm install lucide-react react-hook-form zod @hookform/resolvers
npm install react-markdown remark-gfm

# shadcn/ui セットアップ
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input card dialog toast
```

### 6. 環境変数管理

```typescript
// lib/config/env.ts
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`)
  }
  return value
}

export const config = {
  api: {
    url: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:8001'),
    key: getEnvVar('NEXT_PUBLIC_API_KEY', ''),
  },
  app: {
    name: getEnvVar('NEXT_PUBLIC_APP_NAME', 'RAG Documentation System'),
    version: getEnvVar('NEXT_PUBLIC_APP_VERSION', '1.0.0'),
  },
} as const
```

### 7. 開発環境 (Docker)

#### Dockerfile.dev

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci

# アプリケーションファイルのコピー
COPY . .

# 開発サーバー起動
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

#### docker-compose.yml (ルート)

```yaml
version: '3.8'

services:
  # Backend services
  chromadb:
    extends:
      file: ./backend/docker-compose.yml
      service: chromadb

  rag-api:
    extends:
      file: ./backend/docker-compose.yml
      service: rag-api

  # Frontend service
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    environment:
      - NEXT_PUBLIC_API_URL=http://rag-api:8000
      - NEXT_PUBLIC_API_KEY=4f5793c108119abe
    depends_on:
      - rag-api
    networks:
      - rag-network

networks:
  rag-network:
    driver: bridge
```

### 8. 型定義戦略

```typescript
// types/api.types.ts
export interface SearchRequest {
  query: string
  repository: string
  limit?: number
}

export interface SearchResult {
  content: string
  metadata: {
    path: string
    name: string
    sha: string
    directory: string
    score: number
  }
}

export interface SearchResponse {
  results: SearchResult[]
  total_results: number
  query_time: number
}

// types/domain.types.ts
export interface Repository {
  name: string
  owner: string
  fullName: string
  syncedAt?: Date
  documentCount?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}
```

### 9. テスト戦略

```typescript
// tests/components/SearchBar.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SearchBar } from '@/components/features/search/SearchBar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

describe('SearchBar', () => {
  it('should trigger search on button click', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SearchBar repository="test-repo" />
      </QueryClientProvider>
    )

    const input = screen.getByPlaceholderText('Search documentation...')
    const button = screen.getByText('Search')

    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Searching...')).toBeInTheDocument()
    })
  })
})
```

### 10. パフォーマンス最適化

#### 考慮事項

1. **Code Splitting**
   - 動的インポート活用
   - ルートごとの自動分割

2. **画像最適化**
   - Next.js Image Component
   - WebP自動変換

3. **キャッシュ戦略**
   - ISR (Incremental Static Regeneration)
   - SWR/React Query キャッシュ

4. **Bundle Size**
   - Tree Shaking
   - 依存関係の最小化

```typescript
// 動的インポートの例
const ChatComponent = dynamic(
  () => import('@/components/features/chat/ChatInterface'),
  {
    loading: () => <ChatSkeleton />,
    ssr: false
  }
)
```

## 実装優先順位

### Phase 1: 基本機能 (Week 1)
1. プロジェクトセットアップ
2. 基本UIコンポーネント
3. 検索機能
4. 検索結果表示

### Phase 2: コア機能 (Week 2)
1. リポジトリ選択
2. チャットインターフェース
3. 同期機能
4. エラーハンドリング

### Phase 3: 拡張機能 (Week 3-4)
1. 検索履歴
2. フィルター機能
3. ユーザー設定
4. レスポンシブ対応

## 開発規約

### Prettier設定

#### .prettierrc.json
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

#### .prettierignore
```
# dependencies
node_modules
.pnp
.pnp.js

# production
build
dist
out
.next

# misc
.DS_Store
*.pem
.env*

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# cache
.turbo
.vercel
.cache
```

#### ESLint統合設定 (.eslintrc.json)
```json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": ["error", {}, { "usePrettierrc": true }],
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

#### package.jsonスクリプト
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "pre-commit": "npm run type-check && npm run lint && npm run format:check"
  }
}
```

#### VSCode設定 (.vscode/settings.json)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

#### Husky + lint-staged設定
```bash
# インストール
npm install --save-dev husky lint-staged

# Husky初期化
npx husky-init && npm install
```

#### .lintstagedrc.js
```javascript
module.exports = {
  '*.{js,jsx,ts,tsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  '*.{json,md,mdx,css,scss}': [
    'prettier --write',
  ],
}
```

#### .husky/pre-commit
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

### コーディング規約

#### React推奨パターン

##### 1. useEffectの最小化

```typescript
// ❌ Bad: 不必要なuseEffect
const SearchResults = () => {
  const [results, setResults] = useState([])
  const [filtered, setFiltered] = useState([])
  const [filter, setFilter] = useState('')

  // 不要なuseEffect - 派生状態として計算すべき
  useEffect(() => {
    setFiltered(results.filter(r => r.name.includes(filter)))
  }, [results, filter])

  return <div>{filtered.map(...)}</div>
}

// ✅ Good: 派生状態として計算
const SearchResults = () => {
  const [results, setResults] = useState([])
  const [filter, setFilter] = useState('')

  // レンダリング中に計算（必要に応じてuseMemoでメモ化）
  const filtered = useMemo(
    () => results.filter(r => r.name.includes(filter)),
    [results, filter]
  )

  return <div>{filtered.map(...)}</div>
}

// ✅ Good: イベントハンドラで処理
const Form = () => {
  const [value, setValue] = useState('')

  // ❌ Bad: useEffectで副作用
  useEffect(() => {
    if (value.length > 0) {
      localStorage.setItem('draft', value)
    }
  }, [value])

  // ✅ Good: イベントハンドラで直接処理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    if (newValue.length > 0) {
      localStorage.setItem('draft', newValue)
    }
  }

  return <input value={value} onChange={handleChange} />
}
```

##### 2. カスタムフックでのデータフェッチ（TanStack Query使用）

```typescript
// ❌ Bad: useEffectでのデータフェッチ
const SearchPage = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/search')
      .then(res => res.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false))
  }, [])

  return loading ? <Spinner /> : <Results data={data} />
}

// ✅ Good: TanStack Queryを使用
const SearchPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['search'],
    queryFn: () => fetch('/api/search').then(res => res.json()),
  })

  return isLoading ? <Spinner /> : <Results data={data} />
}

// ✅ Better: カスタムフックに抽出
const useSearchResults = (query: string) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => searchAPI.search(query),
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000,
  })
}

const SearchPage = () => {
  const [query, setQuery] = useState('')
  const { data, isLoading } = useSearchResults(query)

  return (
    <>
      <SearchBar onSearch={setQuery} />
      {isLoading ? <Spinner /> : <Results data={data} />}
    </>
  )
}
```

##### 3. 状態の最適化

```typescript
// ❌ Bad: 単一のオブジェクトで全状態管理
const Form = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    loading: false,
    error: null,
    touched: {}
  })

  // すべての更新で全体が再レンダリング
  const updateField = (field: string, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }
}

// ✅ Good: 状態を適切に分割
const Form = () => {
  const [values, setValues] = useState({ name: '', email: '' })
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const { mutate, isPending } = useMutation({
    mutationFn: submitForm,
  })

  // または React Hook Form を使用
  const { register, handleSubmit, formState } = useForm()
}
```

##### 4. Early Return パターン

```typescript
// ❌ Bad: ネストが深い
const Component = ({ user, data }) => {
  return (
    <div>
      {user ? (
        data ? (
          <Content data={data} />
        ) : (
          <Loading />
        )
      ) : (
        <Login />
      )}
    </div>
  )
}

// ✅ Good: Early return で可読性向上
const Component = ({ user, data }) => {
  if (!user) return <Login />
  if (!data) return <Loading />

  return <Content data={data} />
}
```

##### 5. コンポーネントの責務分離

```typescript
// ❌ Bad: 1つのコンポーネントに多くの責務
const SearchPage = () => {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({})
  const { data, refetch } = useQuery(...)

  const handleSearch = () => { /* 検索ロジック */ }
  const handleFilter = () => { /* フィルタロジック */ }
  const handleSort = () => { /* ソートロジック */ }

  return (
    <div>
      {/* 100行のJSX */}
    </div>
  )
}

// ✅ Good: 責務を分離
const SearchPage = () => {
  const { query, handleSearch } = useSearchQuery()
  const { filters, handleFilter } = useSearchFilters()
  const { data, isLoading } = useSearchResults(query, filters)

  return (
    <SearchLayout>
      <SearchBar onSearch={handleSearch} />
      <SearchFilters onChange={handleFilter} />
      <SearchResults data={data} loading={isLoading} />
    </SearchLayout>
  )
}
```

##### 6. メモ化の適切な使用

```typescript
// ❌ Bad: 過度なメモ化
const Component = () => {
  // プリミティブ値のメモ化は不要
  const value = useMemo(() => 'static string', [])

  // 単純な計算のメモ化も多くの場合不要
  const doubled = useMemo(() => count * 2, [count])

  return <div>{doubled}</div>
}

// ✅ Good: 重い計算や参照の安定性が必要な場合のみ
const Component = ({ items, query }) => {
  // 重い計算処理
  const filtered = useMemo(
    () => items.filter(item =>
      expensiveSearch(item, query)
    ),
    [items, query]
  )

  // 子コンポーネントのpropsとして渡す関数
  const handleClick = useCallback((id: string) => {
    // 処理
  }, [/* 依存配列 */])

  return <ExpensiveChild items={filtered} onClick={handleClick} />
}
```

#### 命名規則

```typescript
// コンポーネント: PascalCase
export const SearchBar: React.FC = () => {}

// カスタムフック: use + PascalCase
export const useSearchResults = () => {}

// イベントハンドラ: handle + EventName
const handleSubmit = () => {}

// boolean変数: is/has/should + Name
const isLoading = true
const hasError = false
const shouldRefetch = true

// 関数: 動詞 + 名詞
const fetchUserData = () => {}
const validateForm = () => {}
```

#### フォーマット例（Prettier適用後）
```typescript
// Before
const SearchBar = ({onSearch,placeholder="Search...",isLoading=false}) => {
  const [query,setQuery]=useState("");
  return <form onSubmit={(e)=>{e.preventDefault();onSearch(query)}} className="flex gap-2"><Input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={placeholder}/><Button type="submit" disabled={isLoading||!query}>{isLoading?"Searching...":"Search"}</Button></form>
}

// After (Prettier適用後)
const SearchBar = ({
  onSearch,
  placeholder = 'Search...',
  isLoading = false,
}: SearchBarProps) => {
  const [query, setQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
      />
      <Button type="submit" disabled={isLoading || !query}>
        {isLoading ? 'Searching...' : 'Search'}
      </Button>
    </form>
  )
}
```

### コミットメッセージ

```
feat: 検索機能の実装
fix: APIエラーハンドリングの修正
style: UIコンポーネントのスタイル調整
refactor: API層のリファクタリング
docs: READMEの更新
```

### ブランチ戦略

```
main
├── develop
│   ├── feature/search-ui
│   ├── feature/chat-interface
│   └── fix/api-error-handling
```

## データキャッシュ戦略

### TanStack Query設定

```typescript
// lib/config/query-client.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分
      gcTime: 10 * 60 * 1000, // 10分（旧 cacheTime）
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnMount: 'always',
    },
    mutations: {
      retry: 1,
    },
  },
})

## セキュリティ考慮事項

1. **APIキーの管理**
   - 環境変数使用
   - クライアント側に秘密情報を含めない

2. **CORS設定**
   - 適切なオリジン制限
   - 認証ヘッダーの検証

3. **入力検証**
   - XSS対策
   - SQLインジェクション防止（APIレベル）

4. **CSP (Content Security Policy)**
   ```typescript
   // next.config.js
   const securityHeaders = [
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
     }
   ]
   ```

この設計方針に基づいてNext.jsフロントエンドを構築することで、保守性が高く、拡張可能なアプリケーションを実現できます。