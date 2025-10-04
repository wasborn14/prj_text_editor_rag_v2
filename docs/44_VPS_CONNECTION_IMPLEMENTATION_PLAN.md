# VPS接続実装プラン

## 現状分析

### 現在のVPS環境
- **API URL**: `http://160.251.211.37/api`（非SSL）
- **CORS設定**: FastAPIで`allow_origins=["*"]`設定済み
- **認証方式**: Bearer Token（`test123`）
- **Nginx**: リバースプロキシ稼働中

### Vercelデプロイ後の課題

#### 1. **Mixed Content問題**
- Vercelは自動的にHTTPS化される（`https://your-app.vercel.app`）
- HTTPSサイトからHTTP APIへのリクエストはブラウザでブロックされる
- **結果**: VPS RAG APIへの接続が不可能

#### 2. **CORS設定**
- ✅ FastAPIで`allow_origins=["*"]`設定済み
- ✅ ブラウザからのクロスオリジンリクエストは許可される
- ⚠️ ただしHTTPSからHTTPへのリクエストはMixed Contentで拒否

#### 3. **認証トークン**
- 現在は固定トークン（`test123`）
- 環境変数で管理可能だが、クライアント側に露出

---

## 解決策の選択肢

### オプション1: VPSにSSL証明書を設定（推奨）

#### メリット
- ✅ Mixed Content問題を根本解決
- ✅ 通信が暗号化され安全
- ✅ Vercelから直接VPS APIを呼び出せる
- ✅ 長期的に正しいアーキテクチャ

#### デメリット
- ⚠️ ドメイン取得が必要（年間$10-15）
- ⚠️ Let's Encrypt設定作業が必要

#### 実装手順
1. ドメイン取得（例: `rag-api.yourdomain.com`）
2. ドメインのDNS A レコードをVPS IPに設定
3. VPSにLet's Encrypt SSL証明書インストール
4. Nginx設定をHTTPS対応に更新

---

### オプション2: Next.js API Routes経由でプロキシ（短期対応）

#### メリット
- ✅ ドメイン不要、すぐ実装可能
- ✅ APIキーをサーバー側で管理（セキュア）
- ✅ Mixed Content問題を回避

#### デメリット
- ⚠️ Next.jsサーバー経由するため若干遅延増加
- ⚠️ Vercelのサーバーレス実行時間制限（10秒）
- ⚠️ アーキテクチャが複雑化

#### 実装手順
1. Next.js API Routesでプロキシエンドポイント作成
2. サーバー側からVPS APIを呼び出し
3. フロントエンドは自サーバーのAPIを呼び出す

---

### オプション3: Tailscale VPN経由（開発環境のみ）

#### メリット
- ✅ VPN内で安全な通信
- ✅ SSL証明書不要

#### デメリット
- ❌ 本番環境では使用不可
- ❌ ユーザーごとにTailscaleインストールが必要

---

## 推奨実装プラン

### フェーズ1: 短期対応（即日実装可能）

**Next.js API Routesでプロキシ実装**

#### 1. API Routes作成

```typescript
// frontend/src/app/api/rag/search/route.ts
import { NextRequest, NextResponse } from 'next/server'

const VPS_RAG_ENDPOINT = process.env.VPS_RAG_ENDPOINT || 'http://160.251.211.37/api'
const VPS_RAG_KEY = process.env.VPS_RAG_KEY || 'test123'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(`${VPS_RAG_ENDPOINT}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VPS_RAG_KEY}`
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'VPS API request failed' },
      { status: 500 }
    )
  }
}
```

```typescript
// frontend/src/app/api/rag/chat/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()

  const response = await fetch(`${VPS_RAG_ENDPOINT}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VPS_RAG_KEY}`
    },
    body: JSON.stringify(body)
  })

  return NextResponse.json(await response.json())
}
```

```typescript
// frontend/src/app/api/rag/sync/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json()

  const response = await fetch(`${VPS_RAG_ENDPOINT}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VPS_RAG_KEY}`
    },
    body: JSON.stringify(body)
  })

  return NextResponse.json(await response.json())
}
```

#### 2. 環境変数設定

```env
# frontend/.env.local
VPS_RAG_ENDPOINT=http://160.251.211.37/api
VPS_RAG_KEY=test123
```

```env
# Vercel環境変数（本番）
VPS_RAG_ENDPOINT=http://160.251.211.37/api
VPS_RAG_KEY=test123
```

#### 3. Hooks修正

```typescript
// frontend/src/hooks/useRAGSearch.ts
export const useRAGSearch = () => {
  const searchDocuments = async (query: string, repository: string, limit = 10) => {
    // VPSに直接アクセスせず、自サーバーのAPI Routesを使用
    const response = await fetch('/api/rag/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, repository, limit })
    })

    return await response.json()
  }

  return { searchDocuments }
}
```

---

### フェーズ2: 中長期対応（1週間以内）

**VPSにSSL証明書設定**

#### 1. ドメイン取得
- **推奨プロバイダー**: Cloudflare、Google Domains、Namecheap
- **例**: `rag-api.yourdomain.com`
- **コスト**: 年間$10-15

#### 2. DNS設定
```
Type: A Record
Name: rag-api
Value: 160.251.211.37
TTL: 3600
```

#### 3. VPSでLet's Encrypt設定

```bash
# VPSにSSH接続
ssh root@160.251.211.37

# Certbot インストール
apt install -y certbot python3-certbot-nginx

# SSL証明書取得
certbot --nginx -d rag-api.yourdomain.com

# 自動更新設定
certbot renew --dry-run
```

#### 4. Nginx設定更新

```nginx
# /etc/nginx/sites-available/rag-api
server {
    listen 80;
    server_name rag-api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name rag-api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/rag-api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/rag-api.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Nginx再起動
nginx -t
systemctl restart nginx
```

#### 5. 環境変数更新

```env
# frontend/.env.local
VPS_RAG_ENDPOINT=https://rag-api.yourdomain.com/api
VPS_RAG_KEY=test123

# または直接接続に戻す
NEXT_PUBLIC_VPS_RAG_ENDPOINT=https://rag-api.yourdomain.com/api
NEXT_PUBLIC_VPS_RAG_KEY=test123
```

---

## セキュリティ強化

### 1. APIキーのローテーション

```bash
# VPS側で強力なAPIキー生成
openssl rand -hex 32

# .env.prodファイル更新
RAG_API_KEY=新しいキー
```

### 2. CORS設定の制限

```python
# backend/api/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "http://localhost:3000"  # 開発環境
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. レート制限

```python
# backend/api/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/api/search")
@limiter.limit("10/minute")
async def search(...):
    ...
```

---

## エラーハンドリング

### 1. VPS接続失敗時のフォールバック

```typescript
// hooks/useRAGSearch.ts
export const useRAGSearch = () => {
  const searchDocuments = async (query: string, repository: string) => {
    try {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, repository, limit: 10 }),
        signal: AbortSignal.timeout(5000) // 5秒タイムアウト
      })

      if (!response.ok) {
        throw new Error('VPS API unavailable')
      }

      return await response.json()
    } catch (error) {
      console.error('RAG search failed:', error)
      // フォールバック: ローカル検索やエラーメッセージ表示
      return { results: [], error: 'Search service temporarily unavailable' }
    }
  }

  return { searchDocuments }
}
```

### 2. タイムアウト設定

```typescript
// Next.js API Route
export const maxDuration = 10 // Vercel制限: 10秒

export async function POST(request: NextRequest) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000) // 8秒でタイムアウト

  try {
    const response = await fetch(`${VPS_RAG_ENDPOINT}/search`, {
      signal: controller.signal,
      // ...
    })
    return NextResponse.json(await response.json())
  } catch (error) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      )
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
```

---

## 実装チェックリスト

### フェーズ1: 短期対応（即日）
- [ ] Next.js API Routesでプロキシ作成（/api/rag/search、/chat、/sync）
- [ ] 環境変数設定（VPS_RAG_ENDPOINT、VPS_RAG_KEY）
- [ ] Hooks修正（VPS直接→自サーバーAPI経由に変更）
- [ ] エラーハンドリング実装
- [ ] Vercel環境変数設定
- [ ] 動作確認

### フェーズ2: 中長期対応（1週間）
- [ ] ドメイン取得
- [ ] DNS A レコード設定
- [ ] VPSにCertbotインストール
- [ ] Let's Encrypt SSL証明書取得
- [ ] Nginx HTTPS設定
- [ ] CORS設定を本番ドメインに制限
- [ ] APIキーローテーション
- [ ] レート制限実装

### セキュリティ
- [ ] APIキー環境変数化確認
- [ ] CORS設定制限
- [ ] レート制限導入
- [ ] タイムアウト設定

---

## コスト試算

### 短期対応（API Routesプロキシ）
- **追加コスト**: $0（Vercelの無料枠内）

### 中長期対応（SSL証明書）
- **ドメイン**: $10-15/年
- **Let's Encrypt**: 無料
- **合計**: 約$15/年

---

## まとめ

### 推奨実装順序

1. **即日**: Next.js API Routesでプロキシ実装（Mixed Content回避）
2. **1週間以内**: VPSにSSL証明書設定（根本解決）
3. **継続的**: セキュリティ強化（レート制限、CORS制限）

この段階的アプローチにより、短期的に動作させながら、長期的に正しいアーキテクチャへ移行できます。
