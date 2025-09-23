# Frontend Architecture & Development Guidelines

## プロジェクト概要

RAGシステムのWebフロントエンドを構築し、現在のCLIベースの操作を直感的なUIで提供する

### 技術スタック
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Form Management**: React Hook Form + Zod
- **Code Quality**: ESLint + Prettier
- **Development**: Docker (local only)
- **Deployment**: Vercel (production)

## 1. ディレクトリ構造

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

## 2. コンポーネント設計（Atomic Design）

### 階層構造

```
components/
├── atoms/              # Button, Input, Badge など最小単位
├── molecules/          # SearchBar, ChatMessage など組み合わせ
├── organisms/          # ChatInterface, SearchResults など複雑な機能
├── templates/          # DashboardTemplate などレイアウト
└── pages/             # Dashboard, Search などページコンポーネント
```

### 実装例

#### Atoms - Button
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
        {
          'primary': 'bg-blue-600 text-white hover:bg-blue-700',
          'secondary': 'bg-gray-200 text-gray-900 hover:bg-gray-300',
          'ghost': 'hover:bg-gray-100'
        }[variant],
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

#### Molecules - SearchBar (React Hook Form使用)
```typescript
// components/molecules/SearchBar/SearchBar.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'

const searchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(100, 'Query too long')
})

type SearchFormData = z.infer<typeof searchSchema>

interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading?: boolean
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
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
          placeholder="Search documentation..."
          error={errors.query?.message}
        />
        <Button type="submit" disabled={isLoading || !isValid}>
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

## 3. 状態管理

### Zustand Store
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
}))
```

### TanStack Query Hook
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

## 4. API層

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
}

export const apiClient = new APIClient()
```

## 5. コーディング規約

### React推奨パターン

#### useEffectの最小化
```typescript
// ❌ Bad: 不必要なuseEffect
const SearchResults = () => {
  const [results, setResults] = useState([])
  const [filtered, setFiltered] = useState([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    setFiltered(results.filter(r => r.name.includes(filter)))
  }, [results, filter])
}

// ✅ Good: 派生状態として計算
const SearchResults = () => {
  const [results, setResults] = useState([])
  const [filter, setFilter] = useState('')

  const filtered = useMemo(
    () => results.filter(r => r.name.includes(filter)),
    [results, filter]
  )
}
```

#### TanStack Queryでデータフェッチ
```typescript
// ❌ Bad: useEffectでのデータフェッチ
useEffect(() => {
  fetch('/api/search')
    .then(res => res.json())
    .then(setData)
}, [])

// ✅ Good: TanStack Query使用
const { data, isLoading } = useQuery({
  queryKey: ['search'],
  queryFn: () => searchAPI.search(),
})
```

#### Early Returnパターン
```typescript
// ✅ Good: Early returnで可読性向上
const Component = ({ user, data }) => {
  if (!user) return <Login />
  if (!data) return <Loading />

  return <Content data={data} />
}
```

#### メモ化の適切な使用
```typescript
// ✅ 重い計算や参照の安定性が必要な場合のみ使用
const filtered = useMemo(
  () => items.filter(item => expensiveSearch(item, query)),
  [items, query]
)
```

### 命名規則
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
```

## 6. 開発環境設定

### Prettier設定 (.prettierrc.json)
```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### ESLint設定 (.eslintrc.json)
```json
{
  "extends": ["next/core-web-vitals", "prettier"],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": ["error", {}, { "usePrettierrc": true }],
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### package.jsonスクリプト
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
    "type-check": "tsc --noEmit"
  }
}
```

## 7. Docker設定（開発環境）

### Dockerfile.dev
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### docker-compose.yml (ルート)
```yaml
version: '3.8'

services:
  chromadb:
    extends:
      file: ./backend/docker-compose.yml
      service: chromadb

  rag-api:
    extends:
      file: ./backend/docker-compose.yml
      service: rag-api

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

## 8. ライブラリ一覧

### 必須パッケージ
```bash
# Core
npm install next react react-dom
npm install --save-dev typescript @types/react @types/node

# State & Data
npm install @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod

# UI & Styling
npm install tailwindcss clsx tailwind-merge
npm install lucide-react

# Development
npm install --save-dev eslint eslint-config-next prettier
npm install --save-dev prettier-plugin-tailwindcss
```

## 9. 実装優先順位

### Phase 1: 基本機能 (Week 1)
1. プロジェクトセットアップ
2. 基本UIコンポーネント (Atoms/Molecules)
3. 検索機能実装
4. APIクライアント構築

### Phase 2: コア機能 (Week 2)
1. チャットインターフェース
2. リポジトリ選択機能
3. 状態管理実装
4. エラーハンドリング

### Phase 3: 最適化 (Week 3)
1. パフォーマンス最適化
2. レスポンシブ対応
3. アクセシビリティ改善
4. テスト実装

## 10. セキュリティ考慮事項

- **環境変数管理**: APIキーは`NEXT_PUBLIC_`プレフィックスで公開情報のみ
- **CORS設定**: Backend側で適切なオリジン制限
- **入力検証**: Zodによるスキーマバリデーション
- **XSS対策**: Reactのデフォルトエスケープ機能を活用

このアーキテクチャに基づいて、保守性が高く拡張可能なフロントエンドを構築できます。