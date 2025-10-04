# RAGプロキシ実装プラン

## 概要

Next.js API Routesを使ってVPS RAG APIへのプロキシを実装し、HTTPS環境（Vercel）からHTTP API（VPS）への安全な接続を実現する。

## アーキテクチャ

### リクエストフロー

```
ブラウザ (HTTPS)
  │
  │ fetch('/api/rag/search')
  ↓
Vercel Next.js API Route (HTTPS)
  │
  │ fetch('http://160.251.211.37/api/search')
  ↓
VPS RAG API (HTTP)
  │
  │ レスポンス
  ↓
Vercel Next.js API Route
  │
  │ JSON レスポンス
  ↓
ブラウザ
```

### メリット

✅ **Mixed Content問題を解決**
- ブラウザからは自サーバー（HTTPS）を呼び出すのみ
- サーバー間通信（HTTP）はブラウザ制約の対象外

✅ **セキュリティ強化**
- VPS APIキーをサーバー側で管理（クライアント露出なし）
- VPS IPアドレスの隠蔽

✅ **即日実装可能**
- SSL証明書不要
- ドメイン取得不要

---

## 実装ステップ

### Step 1: 環境変数設定

#### ローカル環境

```bash
# frontend/.env.local
VPS_RAG_ENDPOINT=http://160.251.211.37/api
VPS_RAG_KEY=test123
```

#### Vercel環境

Vercelダッシュボード → Settings → Environment Variables

```
VPS_RAG_ENDPOINT = http://160.251.211.37/api
VPS_RAG_KEY = test123
```

---

### Step 2: API Routes作成

#### 2.1 検索APIプロキシ

```typescript
// frontend/src/app/api/rag/search/route.ts
import { NextRequest, NextResponse } from 'next/server'

const VPS_RAG_ENDPOINT = process.env.VPS_RAG_ENDPOINT || 'http://160.251.211.37/api'
const VPS_RAG_KEY = process.env.VPS_RAG_KEY || 'test123'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // VPS RAG APIを呼び出し
    const response = await fetch(`${VPS_RAG_ENDPOINT}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VPS_RAG_KEY}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000) // 8秒タイムアウト
    })

    if (!response.ok) {
      throw new Error(`VPS API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('RAG search proxy error:', error)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Search service unavailable' },
      { status: 503 }
    )
  }
}

// Vercelのタイムアウト制限
export const maxDuration = 10
```

#### 2.2 チャットAPIプロキシ

```typescript
// frontend/src/app/api/rag/chat/route.ts
import { NextRequest, NextResponse } from 'next/server'

const VPS_RAG_ENDPOINT = process.env.VPS_RAG_ENDPOINT || 'http://160.251.211.37/api'
const VPS_RAG_KEY = process.env.VPS_RAG_KEY || 'test123'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${VPS_RAG_ENDPOINT}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VPS_RAG_KEY}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000) // チャットは15秒
    })

    if (!response.ok) {
      throw new Error(`VPS API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('RAG chat proxy error:', error)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Chat request timeout' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Chat service unavailable' },
      { status: 503 }
    )
  }
}

export const maxDuration = 20
```

#### 2.3 同期APIプロキシ

```typescript
// frontend/src/app/api/rag/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'

const VPS_RAG_ENDPOINT = process.env.VPS_RAG_ENDPOINT || 'http://160.251.211.37/api'
const VPS_RAG_KEY = process.env.VPS_RAG_KEY || 'test123'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${VPS_RAG_ENDPOINT}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VPS_RAG_KEY}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000) // 同期は30秒
    })

    if (!response.ok) {
      throw new Error(`VPS API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('RAG sync proxy error:', error)

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Sync request timeout' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { error: 'Sync service unavailable' },
      { status: 503 }
    )
  }
}

export const maxDuration = 40
```

---

### Step 3: Hooks実装

#### 3.1 検索Hook

```typescript
// frontend/src/hooks/useRAGSearch.ts
import { useState } from 'react'

interface SearchResult {
  content: string
  metadata: {
    path: string
    name: string
    chunk_index: number
  }
  score: number
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  error?: string
}

export const useRAGSearch = () => {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchDocuments = async (
    query: string,
    repository: string,
    limit = 10
  ): Promise<SearchResult[]> => {
    setIsSearching(true)
    setError(null)

    try {
      // 自サーバーのAPI Routeを呼び出し
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, repository, limit })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Search failed')
      }

      const data: SearchResponse = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return data.results || []

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Search error:', errorMessage)
      return []
    } finally {
      setIsSearching(false)
    }
  }

  return { searchDocuments, isSearching, error }
}
```

#### 3.2 チャットHook

```typescript
// frontend/src/hooks/useRAGChat.ts
import { useState } from 'react'

interface ChatSource {
  path: string
  relevance: number
  chunk_index: number
  preview: string
}

interface ChatResponse {
  answer: string
  sources: ChatSource[]
  context_used: number
  repository: string
  error?: string
}

export const useRAGChat = () => {
  const [isChatting, setIsChatting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const askQuestion = async (
    message: string,
    repository: string,
    contextLimit = 5
  ): Promise<ChatResponse | null> => {
    setIsChatting(true)
    setError(null)

    try {
      const response = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          repository,
          context_limit: contextLimit
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chat failed')
      }

      const data: ChatResponse = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      return data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Chat error:', errorMessage)
      return null
    } finally {
      setIsChatting(false)
    }
  }

  return { askQuestion, isChatting, error }
}
```

#### 3.3 同期Hook

```typescript
// frontend/src/hooks/useRAGSync.ts
import { useState } from 'react'

interface SyncResponse {
  status: string
  repository: string
  files_synced: number
  message: string
  error?: string
}

export const useRAGSync = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncRepository = async (
    repository: string
  ): Promise<SyncResponse | null> => {
    setIsSyncing(true)
    setError(null)

    try {
      const response = await fetch('/api/rag/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repository })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Sync failed')
      }

      const data: SyncResponse = await response.json()

      if (data.error || data.status === 'error') {
        throw new Error(data.error || data.message)
      }

      return data

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Sync error:', errorMessage)
      return null
    } finally {
      setIsSyncing(false)
    }
  }

  return { syncRepository, isSyncing, error }
}
```

---

### Step 4: 型定義

```typescript
// frontend/src/types/rag.ts
export interface SearchResult {
  content: string
  metadata: {
    path: string
    name: string
    chunk_index: number
    total_chunks?: number
  }
  score: number
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  error?: string
}

export interface ChatSource {
  path: string
  relevance: number
  chunk_index: number
  preview: string
}

export interface ChatResponse {
  answer: string
  sources: ChatSource[]
  context_used: number
  repository: string
  error?: string
}

export interface SyncResponse {
  status: 'success' | 'error'
  repository: string
  files_synced: number
  message: string
  error?: string
}
```

---

### Step 5: テスト

#### 5.1 ローカルテスト

```bash
# 開発サーバー起動
cd frontend
npm run dev

# ブラウザコンソールでテスト
fetch('/api/rag/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'VPS setup',
    repository: 'wasborn14/test-editor',
    limit: 3
  })
}).then(r => r.json()).then(console.log)
```

#### 5.2 統合テスト

```typescript
// frontend/src/app/test-rag/page.tsx
'use client'

import { useState } from 'react'
import { useRAGSearch } from '@/hooks/useRAGSearch'

export default function TestRAGPage() {
  const [query, setQuery] = useState('VPS setup')
  const { searchDocuments, isSearching, error } = useRAGSearch()
  const [results, setResults] = useState<any[]>([])

  const handleSearch = async () => {
    const res = await searchDocuments(query, 'wasborn14/test-editor', 5)
    setResults(res)
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">RAG API Test</h1>

      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border p-2 w-full"
          placeholder="Enter search query..."
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div>
        <h2 className="font-bold mb-2">Results ({results.length})</h2>
        {results.map((result, i) => (
          <div key={i} className="border p-3 mb-2 rounded">
            <div className="font-medium">{result.metadata?.path}</div>
            <div className="text-sm text-gray-600 mt-1">{result.content}</div>
            <div className="text-xs text-gray-400 mt-1">
              Score: {result.score?.toFixed(3)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## デプロイ手順

### 1. 環境変数をVercelに設定

```bash
# Vercel CLIを使う場合
vercel env add VPS_RAG_ENDPOINT
# 値: http://160.251.211.37/api

vercel env add VPS_RAG_KEY
# 値: test123
```

または Vercelダッシュボード:
1. プロジェクト選択
2. Settings → Environment Variables
3. `VPS_RAG_ENDPOINT` = `http://160.251.211.37/api`
4. `VPS_RAG_KEY` = `test123`
5. Environment: Production, Preview, Development 全てチェック

### 2. デプロイ

```bash
# Gitにプッシュ（自動デプロイ）
git add .
git commit -m "Add RAG API proxy routes"
git push origin main

# または手動デプロイ
vercel --prod
```

### 3. 動作確認

```bash
# 本番環境テスト
curl -X POST https://your-app.vercel.app/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "VPS setup",
    "repository": "wasborn14/test-editor",
    "limit": 3
  }'
```

---

## エラーハンドリング

### タイムアウト設定

| API | タイムアウト | 理由 |
|-----|------------|------|
| `/api/rag/search` | 8秒 | 検索は高速レスポンス必須 |
| `/api/rag/chat` | 15秒 | AI生成に時間がかかる |
| `/api/rag/sync` | 30秒 | リポジトリ同期は重い処理 |

### エラーレスポンス

```typescript
// タイムアウト
{
  "error": "Request timeout",
  "status": 504
}

// API障害
{
  "error": "Search service unavailable",
  "status": 503
}

// VPSエラー
{
  "error": "VPS API error: 500",
  "status": 500
}
```

---

## セキュリティ考慮事項

### ✅ 実装済み
- APIキーをサーバー側環境変数で管理
- VPS IPアドレスの隠蔽
- タイムアウト設定でリソース保護

### 🔄 今後の強化
- レート制限（Next.js middleware）
- リクエストログ記録
- ユーザー認証との統合

---

## トラブルシューティング

### 問題: 504 Gateway Timeout

**原因**: VPSが応答しない、または遅い

**解決策**:
```bash
# VPS稼働確認
curl http://160.251.211.37/health

# VPSログ確認
ssh root@160.251.211.37
docker-compose -f backend/docker-compose.prod.yml logs -f api
```

### 問題: 503 Service Unavailable

**原因**: VPS APIが停止

**解決策**:
```bash
# VPS再起動
ssh root@160.251.211.37
cd /opt/prj_text_editor_rag_v1/backend
docker-compose -f docker-compose.prod.yml restart
```

### 問題: CORS エラー

**原因**: Vercelドメインが許可されていない

**解決策**:
```python
# backend/api/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "http://localhost:3000"
    ],
    # ...
)
```

---

## 実装チェックリスト

### API Routes
- [ ] `/api/rag/search/route.ts` 作成
- [ ] `/api/rag/chat/route.ts` 作成
- [ ] `/api/rag/sync/route.ts` 作成
- [ ] タイムアウト設定
- [ ] エラーハンドリング実装

### Hooks
- [ ] `useRAGSearch.ts` 作成
- [ ] `useRAGChat.ts` 作成
- [ ] `useRAGSync.ts` 作成
- [ ] 型定義追加

### 環境変数
- [ ] `.env.local` に追加（ローカル）
- [ ] Vercel環境変数設定（本番）
- [ ] `.env.local.example` 更新

### テスト
- [ ] ローカル動作確認
- [ ] テストページ作成
- [ ] Vercelデプロイ後確認

### ドキュメント
- [ ] README更新
- [ ] API仕様書作成

---

## まとめ

このプロキシパターンにより:

✅ **即日実装可能** - SSL証明書・ドメイン不要
✅ **セキュア** - APIキーがクライアントに露出しない
✅ **シンプル** - 既存のNext.js機能のみで実装
✅ **拡張可能** - 将来のSSL化にも対応可能

次のステップ: 実装開始時に声をかけてください。
