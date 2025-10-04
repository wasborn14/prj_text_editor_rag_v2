# VPS RAG統合ガイド

## 概要

VPS上で稼働中のRAG（Retrieval-Augmented Generation）システムとFrontendアプリケーションの統合方法をまとめたドキュメント。

## VPS RAG環境情報

### 接続情報
- **API URL**: `http://160.251.211.37/api`
- **VPS IP**: `160.251.211.37`
- **認証方式**: Bearer Token
- **APIキー**: `test123`
- **ドキュメント**: `http://160.251.211.37/docs`

### 稼働確認
```bash
# ヘルスチェック
curl http://160.251.211.37/health
# => {"status":"healthy"}

# APIルート
curl http://160.251.211.37/
# => {"name":"VPS RAG API","version":"1.0.0","status":"running","docs":"/docs"}
```

---

## 利用可能な機能

### 1. セマンティック検索 (`/api/search`)

**できること**:
- GitHubリポジトリ内のMarkdownファイルを自然言語で検索
- キーワード完全一致ではなく、意味的に関連するドキュメントを発見
- スコア付きで結果を返却

**技術スタック**:
- ChromaDB（ベクトルデータベース）
- OpenAI Embeddings（text-embedding-3-small）

**パフォーマンス**:
- レスポンス時間: < 200ms

**リクエスト例**:
```bash
curl -X POST http://160.251.211.37/api/search \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "VPSの設定方法",
    "repository": "wasborn14/test-editor",
    "limit": 5
  }'
```

**レスポンス形式**:
```json
{
  "results": [
    {
      "content": "...",
      "metadata": {
        "path": "docs/11_VPS_SETUP_GUIDE.md",
        "chunk_index": 0,
        "name": "VPS_SETUP_GUIDE.md"
      },
      "score": 0.892
    }
  ],
  "total": 5
}
```

---

### 2. RAGチャット (`/api/chat`)

**できること**:
- ドキュメントを参照しながらAIが質問に回答
- 回答の根拠となるソースファイルを明示
- プロジェクトの説明・技術的な質問・コード解説が可能

**技術スタック**:
- OpenAI GPT-4o-mini
- Temperature: 0.3（一貫性重視）
- Max Tokens: 500

**リクエスト例**:
```bash
curl -X POST http://160.251.211.37/api/chat \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "このプロジェクトの概要を教えてください",
    "repository": "wasborn14/test-editor",
    "context_limit": 3
  }'
```

**レスポンス形式**:
```json
{
  "answer": "プロジェクトは、VPS上で動作するRAGシステムです...",
  "sources": [
    {
      "path": "README.md",
      "relevance": 0.892,
      "chunk_index": 0,
      "preview": "# VPS RAG-Powered Markdown Editor..."
    }
  ],
  "context_used": 3,
  "repository": "wasborn14/test-editor"
}
```

---

### 3. リポジトリ同期 (`/api/sync`)

**できること**:
- GitHubリポジトリの全Markdownファイルをインデックス化
- 500文字単位でチャンク分割してベクトル保存
- 同期後すぐに検索・チャット機能が利用可能

**処理フロー**:
1. GitHubリポジトリから.mdファイルを再帰的に取得
2. テキストを500文字単位でチャンク分割
3. OpenAI Embeddingsでベクトル化
4. ChromaDBに保存

**リクエスト例**:
```bash
curl -X POST http://160.251.211.37/api/sync \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "wasborn14/test-editor"
  }'
```

**レスポンス形式**:
```json
{
  "status": "success",
  "repository": "wasborn14/test-editor",
  "files_synced": 42,
  "message": "Successfully synced 42 files"
}
```

---

### 4. ディレクトリ限定検索 (`/api/search/directory`)

**できること**:
- 特定フォルダ内のみを対象に検索
- docs/フォルダのみ検索、など絞り込み可能

**リクエスト例**:
```bash
curl -X POST http://160.251.211.37/api/search/directory \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "実装方法",
    "repository": "wasborn14/test-editor",
    "directory": "docs",
    "limit": 5
  }'
```

---

## Frontend統合方法

### 環境変数設定

```env
# frontend/.env.local
NEXT_PUBLIC_VPS_RAG_ENDPOINT=http://160.251.211.37/api
NEXT_PUBLIC_VPS_RAG_KEY=test123
```

### API Hooks実装

#### 1. セマンティック検索Hook

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

export const useRAGSearch = () => {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchDocuments = async (query: string, repository: string, limit = 10) => {
    setIsSearching(true)
    setError(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_VPS_RAG_ENDPOINT}/search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_VPS_RAG_KEY}`
          },
          body: JSON.stringify({ query, repository, limit })
        }
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      return data.results as SearchResult[]
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return []
    } finally {
      setIsSearching(false)
    }
  }

  return { searchDocuments, isSearching, error }
}
```

#### 2. RAGチャットHook

```typescript
// frontend/src/hooks/useRAGChat.ts
import { useState } from 'react'

interface ChatResponse {
  answer: string
  sources: Array<{
    path: string
    relevance: number
    chunk_index: number
    preview: string
  }>
  context_used: number
  repository: string
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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_VPS_RAG_ENDPOINT}/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_VPS_RAG_KEY}`
          },
          body: JSON.stringify({
            message,
            repository,
            context_limit: contextLimit
          })
        }
      )

      if (!response.ok) {
        throw new Error('Chat request failed')
      }

      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsChatting(false)
    }
  }

  return { askQuestion, isChatting, error }
}
```

#### 3. リポジトリ同期Hook

```typescript
// frontend/src/hooks/useRAGSync.ts
import { useState } from 'react'

export const useRAGSync = () => {
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncRepository = async (repository: string) => {
    setIsSyncing(true)
    setError(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_VPS_RAG_ENDPOINT}/sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_VPS_RAG_KEY}`
          },
          body: JSON.stringify({ repository })
        }
      )

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      const data = await response.json()
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsSyncing(false)
    }
  }

  return { syncRepository, isSyncing, error }
}
```

---

## UI統合パターン

### パターン1: エディタ内検索パネル

**実装場所**: エディタ右パネルまたはサイドバー

**機能**:
- セマンティック検索UI
- 検索結果一覧表示
- クリックで該当ファイルを開く

**コンポーネント例**:
```typescript
// components/organisms/SearchPanel.tsx
export function SearchPanel({ repository }: { repository: string }) {
  const [query, setQuery] = useState('')
  const { searchDocuments, isSearching, error } = useRAGSearch()
  const [results, setResults] = useState<SearchResult[]>([])

  const handleSearch = async () => {
    const searchResults = await searchDocuments(query, repository)
    setResults(searchResults)
  }

  return (
    <div className="p-4">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documents..."
      />
      <button onClick={handleSearch} disabled={isSearching}>
        {isSearching ? 'Searching...' : 'Search'}
      </button>

      {results.map((result, i) => (
        <div key={i} className="border-b py-2">
          <div className="font-medium">{result.metadata.path}</div>
          <div className="text-sm text-gray-600">{result.content}</div>
          <div className="text-xs text-gray-400">Score: {result.score.toFixed(3)}</div>
        </div>
      ))}
    </div>
  )
}
```

---

### パターン2: AIアシスタントチャット

**実装場所**: モーダルまたは固定チャットパネル

**機能**:
- 自然言語で質問入力
- AI回答表示
- ソースファイルへのリンク

**コンポーネント例**:
```typescript
// components/organisms/ChatPanel.tsx
export function ChatPanel({ repository }: { repository: string }) {
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatResponse[]>([])
  const { askQuestion, isChatting } = useRAGChat()

  const handleAsk = async () => {
    const response = await askQuestion(message, repository)
    if (response) {
      setChatHistory([...chatHistory, response])
      setMessage('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {chatHistory.map((chat, i) => (
          <div key={i} className="mb-4">
            <div className="font-medium">{chat.answer}</div>
            <div className="text-sm text-gray-500 mt-2">
              Sources:
              {chat.sources.map((src, j) => (
                <div key={j}>{src.path} (relevance: {src.relevance})</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask a question..."
        />
        <button onClick={handleAsk} disabled={isChatting}>
          {isChatting ? 'Thinking...' : 'Ask'}
        </button>
      </div>
    </div>
  )
}
```

---

### パターン3: 自動同期機能

**実装場所**: リポジトリ選択時・ファイル保存時

**機能**:
- リポジトリ選択時に同期状態チェック
- 未同期の場合は自動同期実行
- バックグラウンドで定期同期

**実装例**:
```typescript
// app/workspace/page.tsx
const handleRepositorySelect = async (repo: UserRepository) => {
  setSelectedRepository(repo)

  // 自動同期チェック
  const { syncRepository, isSyncing } = useRAGSync()
  await syncRepository(`${repo.owner}/${repo.name}`)
}
```

---

## 統合メリット

### 開発効率向上
- ✅ 編集中に関連ドキュメントをすぐに検索
- ✅ 過去の実装パターンを素早く参照
- ✅ プロジェクト理解が加速

### コスト削減
- ✅ Supabase pgvectorより低コスト
- ✅ 既存VPSインフラの有効活用
- ✅ OpenAI API（gpt-4o-mini）で低コスト運用

### ユーザー体験向上
- ✅ AI支援による効率的な編集
- ✅ 関連ファイル発見が容易
- ✅ プロジェクト全体の把握が簡単

---

## 次のステップ

### 実装優先度

1. **検索パネル追加** - セマンティック検索UI実装
2. **自動同期機能** - リポジトリ選択時の自動インデックス更新
3. **チャットパネル追加** - RAGチャット機能実装

### 技術的考慮事項

- **CORS設定**: VPS側で適切なCORS設定確認
- **エラーハンドリング**: API障害時のフォールバック処理
- **キャッシング**: 同じクエリの結果をキャッシュ
- **レート制限**: OpenAI APIのクォータ管理

---

## 関連ドキュメント

- [04_VPS_RAG_IMPLEMENTATION.md](./04_VPS_RAG_IMPLEMENTATION.md) - RAG実装プラン
- [11_VPS_SETUP_GUIDE.md](./11_VPS_SETUP_GUIDE.md) - VPSセットアップガイド
- [15_RAG_CHAT_IMPLEMENTATION.md](./15_RAG_CHAT_IMPLEMENTATION.md) - チャット機能実装
- [42_PROJECT_OVERVIEW.md](./42_PROJECT_OVERVIEW.md) - プロジェクト全体概要
