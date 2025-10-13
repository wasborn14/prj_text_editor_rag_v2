# VPS Deployment First Strategy

VPS RAG先行展開とprj_text_editor_v2シンプル開発計画

## 📋 目次

1. [戦略概要](#戦略概要)
2. [VPS RAG先行展開計画](#vps-rag先行展開計画)
3. [プロジェクトv2設計方針](#プロジェクトv2設計方針)
4. [実装ロードマップ](#実装ロードマップ)
5. [VPS選定とコスト](#vps選定とコスト)
6. [展開手順](#展開手順)

## 戦略概要

### 🎯 新しいアプローチ：VPS先行戦略

```bash
Phase 1: VPS RAG展開 (優先) ← 今回実施
├── 本番VPS環境構築
├── Docker展開
├── ドメイン・SSL設定
└── RAG API本番稼働

Phase 2: フロントエンド開発 (後続)
├── prj_text_editor_v2作成
├── シンプルなUI/UX
├── VPS RAG API連携
└── 段階的機能追加

Phase 3: 統合・最適化
├── 本番統合テスト
├── パフォーマンス調整
├── ユーザビリティ改善
└── LangChain移行準備
```

### 🔄 v1からv2への方針転換

| 項目 | prj_text_editor_v1 | prj_text_editor_v2 |
|-----|-------------------|-------------------|
| **複雑度** | 高機能・複雑 | シンプル・実用的 |
| **AI統合** | 複数プロバイダー | VPS RAGのみ |
| **GitHub統合** | 複雑な同期システム | 基本連携 |
| **認証** | マルチテナント複雑 | シンプル認証 |
| **データベース** | Supabase複雑構造 | 軽量構造 |
| **開発速度** | 遅い（機能過多） | 速い（必要最小限） |
| **VPS統合** | 考慮なし | 統合前提設計 |

## VPS RAG先行展開計画

### 🚀 Phase 1A: VPS環境選定・構築

#### **VPS選定基準**
```bash
# 最小要件（現在実装）
RAM: 1GB
CPU: 1コア
Storage: 20GB SSD
Network: 1TB/月
OS: Ubuntu 22.04 LTS

# 推奨要件（将来のLangChain対応）
RAM: 2-4GB (スケールアップ可能)
CPU: 2コア
Storage: 40GB SSD
Network: 2TB/月
```

#### **推奨VPSプロバイダー**

**1. ConoHa VPS (国内・推奨)**
```bash
# 最小プラン
メモリ: 1GB, CPU: 2コア, SSD: 100GB
料金: ¥682/月
特徴: 国内高速、日本語サポート、時間課金可能

# 拡張プラン (LangChain対応)
メモリ: 2GB, CPU: 3コア, SSD: 100GB
料金: ¥1,738/月
```

**2. さくらのVPS (国内・安定)**
```bash
# 最小プラン
メモリ: 1GB, CPU: 2コア, SSD: 50GB
料金: ¥807/月
特徴: 老舗の安定性、24時間サポート

# 拡張プラン
メモリ: 2GB, CPU: 3コア, SSD: 100GB
料金: ¥1,738/月
```

**3. Vultr (海外・コスパ)**
```bash
# 最小プラン
メモリ: 1GB, CPU: 1コア, SSD: 25GB
料金: $6/月 (¥840/月)
特徴: 高性能、グローバル展開

# 拡張プラン
メモリ: 2GB, CPU: 1コア, SSD: 50GB
料金: $12/月 (¥1,680/月)
```

### 🔧 Phase 1B: Docker展開準備

#### **本番用docker-compose.yml**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  rag-api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: rag-api-prod
    restart: unless-stopped
    ports:
      - "8001:8001"
    volumes:
      - ./data/chromadb:/data/chromadb
      - ./logs:/app/logs
    environment:
      - ENV=production
      - API_SECRET_KEY=${API_SECRET_KEY}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    networks:
      - rag-network
    deploy:
      resources:
        limits:
          memory: 800M
        reservations:
          memory: 400M

  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - rag-api
    networks:
      - rag-network

networks:
  rag-network:
    driver: bridge

volumes:
  chromadb_data:
    driver: local
```

#### **本番用Nginx設定**
```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream rag_api {
        server rag-api:8001;
    }

    # HTTP -> HTTPS リダイレクト
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS 本番サーバー
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;

        # セキュリティヘッダー
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # RAG API プロキシ
        location /api/ {
            proxy_pass http://rag_api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # タイムアウト設定
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # ヘルスチェック
        location /health {
            proxy_pass http://rag_api/health;
        }

        # 静的ファイル (将来のフロントエンド用)
        location / {
            root /var/www/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

### 🔐 Phase 1C: セキュリティ・SSL設定

#### **SSL証明書 (Let's Encrypt)**
```bash
# Certbot インストール・設定
sudo apt update
sudo apt install certbot python3-certbot-nginx

# SSL証明書取得
sudo certbot --nginx -d your-domain.com

# 自動更新設定
sudo crontab -e
# 追加: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### **ファイアウォール設定**
```bash
# UFW基本設定
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 必要ポートのみ開放
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# VPS RAG専用ポート (開発時のみ)
sudo ufw allow 8001/tcp

sudo ufw enable
```

### 📊 Phase 1D: モニタリング・ログ

#### **基本ログ設定**
```bash
# ログディレクトリ作成
mkdir -p logs/nginx logs/app

# ログローテーション設定
sudo vim /etc/logrotate.d/rag-system
```

```bash
# /etc/logrotate.d/rag-system
/home/user/rag-system/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    sharedscripts
}
```

## プロジェクトv2設計方針

### 🎯 prj_text_editor_v2 アーキテクチャ

#### **シンプル構成**
```bash
prj_text_editor_v2/
├── app/                     # Next.js App Router
│   ├── api/                 # VPS RAG API プロキシ
│   ├── auth/                # 認証関連
│   ├── editor/              # エディター画面
│   └── layout.tsx           # 共通レイアウト
├── components/              # UIコンポーネント
│   ├── Editor/              # CodeMirror エディター
│   ├── RAGSearch/           # RAG検索UI
│   ├── FileTree/            # ファイルツリー
│   └── Auth/                # 認証コンポーネント
├── hooks/                   # カスタムフック
│   ├── useRAGAPI.ts         # VPS RAG API連携
│   ├── useAuth.ts           # 認証管理
│   └── useFileTree.ts       # ファイル管理
├── lib/                     # ユーティリティ
│   ├── ragClient.ts         # VPS RAG APIクライアント
│   ├── supabase.ts          # Supabase設定
│   └── utils.ts             # 共通関数
└── types/                   # TypeScript型定義
    ├── rag.ts               # RAG API型
    ├── auth.ts              # 認証型
    └── file.ts              # ファイル型
```

#### **技術スタック（簡素化）**
```json
{
  "dependencies": {
    "next": "15.5.3",
    "react": "19.1.0",
    "typescript": "^5",
    "tailwindcss": "^4",
    "@supabase/supabase-js": "^2.57.4",
    "@uiw/react-codemirror": "^4.25.1",
    "@codemirror/lang-markdown": "^6.3.4",
    "lucide-react": "^0.544.0",
    "react-markdown": "^10.1.0"
  }
}
```

#### **v1からの削除項目**
```bash
❌ 複雑なAI統合 (@anthropic-ai/sdk, openai, @google/generative-ai)
❌ GitHub複雑統合 (@octokit/rest, @octokit/auth-app)
❌ 高度なエディター機能 (@codemirror/merge)
❌ マルチテナント複雑性 (@supabase/auth-helpers-nextjs)
❌ 過度な状態管理 (@tanstack/react-query)
```

### 🔗 VPS RAG統合設計

#### **API連携アーキテクチャ**
```typescript
// lib/ragClient.ts
class RAGClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_RAG_API_URL || 'https://your-vps.com';
    this.apiKey = process.env.NEXT_PUBLIC_RAG_API_KEY || '';
  }

  async search(query: string, repository: string): Promise<SearchResult[]> {
    const response = await fetch(`${this.baseURL}/api/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, repository, limit: 10 }),
    });
    return response.json();
  }

  async searchByDirectory(query: string, repository: string, directory: string): Promise<SearchResult[]> {
    const response = await fetch(`${this.baseURL}/api/search/directory`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, repository, directory, limit: 5 }),
    });
    return response.json();
  }

  async syncRepository(repository: string): Promise<SyncResult> {
    const response = await fetch(`${this.baseURL}/api/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ repository }),
    });
    return response.json();
  }
}
```

#### **フロントエンド統合**
```typescript
// hooks/useRAGAPI.ts
export function useRAGAPI() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  const ragClient = new RAGClient();

  const search = async (query: string, repository: string) => {
    setLoading(true);
    try {
      const results = await ragClient.search(query, repository);
      setResults(results);
    } catch (error) {
      console.error('RAG search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { search, loading, results };
}
```

## 実装ロードマップ

### 📅 Phase 1: VPS RAG展開 (1-2週間)

#### **Week 1: VPS環境構築**
```bash
Day 1-2: VPS契約・初期設定
├── VPSプロバイダー選定・契約
├── Ubuntu 22.04インストール
├── 基本セキュリティ設定
└── Docker・docker-compose インストール

Day 3-4: ドメイン・SSL設定
├── ドメイン取得・DNS設定
├── Let's Encrypt SSL証明書
├── Nginx プロキシ設定
└── ファイアウォール設定

Day 5-7: RAG展開・テスト
├── 本番用docker-compose設定
├── 環境変数・シークレット設定
├── RAG API展開
└── 動作確認・負荷テスト
```

#### **Week 2: 本番環境調整**
```bash
Day 8-10: 最適化・モニタリング
├── パフォーマンス調整
├── ログ設定・ローテーション
├── バックアップ設定
└── アラート設定

Day 11-14: 安定化・ドキュメント
├── 障害対応手順作成
├── 運用ドキュメント整備
├── API仕様書更新
└── セキュリティ監査
```

### 📅 Phase 2: フロントエンド開発 (2-3週間)

#### **Week 3: プロジェクト基盤**
```bash
Day 15-17: Next.js セットアップ
├── prj_text_editor_v2 作成
├── TypeScript・Tailwind設定
├── Supabase認証設定
└── 基本レイアウト作成

Day 18-21: コア機能実装
├── CodeMirror エディター統合
├── VPS RAG API連携
├── ファイルツリーUI
└── 検索インターフェース
```

#### **Week 4-5: 統合・完成**
```bash
Day 22-28: 機能統合
├── エディター ↔ RAG連携
├── ファイル管理機能
├── レスポンシブUI
└── エラーハンドリング

Day 29-35: テスト・デプロイ
├── 統合テスト
├── ユーザビリティテスト
├── パフォーマンス最適化
└── 本番デプロイ
```

## VPS選定とコスト

### 💰 推奨VPSプラン

#### **Phase 1: 最小構成 (現在RAG)**
```bash
ConoHa VPS 1GBプラン
- メモリ: 1GB
- CPU: 2コア
- SSD: 100GB
- 転送量: 目安無制限
- 料金: ¥682/月
- 年額: ¥8,184
```

#### **Phase 3: 拡張構成 (LangChain対応)**
```bash
ConoHa VPS 2GBプラン
- メモリ: 2GB
- CPU: 3コア
- SSD: 100GB
- 料金: ¥1,738/月 (差額 +¥1,056/月)
- 年額: ¥20,856
```

#### **追加コスト**
```bash
ドメイン: ¥1,000-2,000/年 (.com/.jpなど)
SSL証明書: ¥0 (Let's Encrypt無料)
バックアップ: ¥100-300/月 (オプション)
```

#### **総コスト試算 (1年間)**
```bash
# Phase 1のみ
VPS: ¥8,184 + ドメイン: ¥1,500 = ¥9,684/年

# Phase 3移行後
VPS: ¥20,856 + ドメイン: ¥1,500 = ¥22,356/年

# Azure比較
Azure Container Instances: $30-50/月 = ¥42,000-70,000/年
→ VPSは1/2-1/3のコスト
```

## 展開手順

### 🚀 即座に開始可能な作業

#### **1. VPS選定・契約 (今日)**
```bash
推奨: ConoHa VPS
1. https://www.conoha.jp/vps/ でアカウント作成
2. 1GBプラン選択
3. Ubuntu 22.04 LTS選択
4. SSHキー設定
5. 契約完了後、IPアドレス確認
```

#### **2. ドメイン取得 (今日-明日)**
```bash
推奨ドメイン名:
- your-project-rag.com
- your-name-rag.dev
- your-editor-api.com

プロバイダー:
- お名前.com (国内)
- Cloudflare (海外・安価)
- Google Domains (簡単)
```

#### **3. 初期セットアップ (今週末)**
```bash
# VPS初期設定
1. SSH接続確認
2. セキュリティ更新
3. Docker インストール
4. ファイアウォール設定
5. 現在のRAGシステム展開テスト
```

### 📋 次回の具体的作業

#### **最優先 (次の1週間)**
1. **VPS契約・初期設定**
2. **ドメイン取得・DNS設定**
3. **基本セキュリティ設定**
4. **Docker展開テスト**

#### **第2優先 (次の2週間)**
1. **SSL証明書設定**
2. **Nginx プロキシ設定**
3. **本番RAG API稼働**
4. **動作確認・ドキュメント**

#### **第3優先 (次の1ヶ月)**
1. **prj_text_editor_v2 作成**
2. **VPS RAG API連携**
3. **基本UI実装**
4. **統合テスト**

---

**戦略決定**: VPS RAG先行展開 → シンプルフロント開発 → 段階的統合
**次回目標**: VPS環境構築と本番RAG API稼働
**期待効果**: 実用的なRAGシステムの早期実現とフロント開発の効率化

---

## ConoHa VPS設定ガイド

### 🚀 ConoHa VPS推奨理由

**選定根拠:**
- ✅ 国内最高クラスの通信速度
- ✅ 時間課金対応（開発中のコスト削減）
- ✅ 24時間日本語サポート
- ✅ 簡単スケールアップ（1GB→2GB即座に変更可能）
- ✅ 初期費用無料
- ✅ SSD標準、高性能

### 💰 料金プラン詳細

#### **推奨プラン: 1GBプラン**
```bash
基本仕様:
- メモリ: 1GB
- CPU: 2コア
- SSD: 100GB
- 転送量: 目安無制限
- IPv4: 1個（固定IP）

料金:
- 月額: ¥682
- 時間単位: ¥1.3/時間
- 年額: ¥8,184（約¥680/月 x 12）

# 開発期間の実際のコスト例
開発・テスト期間（1ヶ月）: ¥682
本格運用（年間）: ¥8,184
```

#### **将来の拡張プラン: 2GBプラン（LangChain対応）**
```bash
基本仕様:
- メモリ: 2GB
- CPU: 3コア
- SSD: 100GB

料金:
- 月額: ¥1,738
- 差額: +¥1,056/月
- スケールアップ: 管理画面から即座に変更可能
```

### 🔧 ConoHa VPS初期設定手順

#### **Step 1: アカウント作成・VPS契約**
```bash
1. https://www.conoha.jp/vps/ でアカウント作成
2. 本人確認（電話認証）
3. 支払い方法設定（クレジットカード推奨）
4. VPSプラン選択：
   - リージョン: 東京（推奨）
   - プラン: 1GB
   - イメージタイプ: Ubuntu 22.04 LTS
   - rootパスワード設定
   - SSH Key登録（推奨）
```

#### **Step 2: 初期セキュリティ設定**
```bash
# SSH接続確認
ssh root@[VPS-IP-ADDRESS]

# システム更新
apt update && apt upgrade -y

# 作業用ユーザー作成
adduser raguser
usermod -aG sudo raguser

# SSH設定強化
vim /etc/ssh/sshd_config
---
Port 22122  # デフォルトポート変更
PermitRootLogin no  # root直接ログイン禁止
PasswordAuthentication no  # パスワード認証無効化（SSH鍵のみ）
---
systemctl restart sshd

# ファイアウォール設定
ufw default deny incoming
ufw default allow outgoing
ufw allow 22122/tcp  # SSH新ポート
ufw allow 80/tcp     # HTTP
ufw allow 443/tcp    # HTTPS
ufw enable
```

#### **Step 3: 必要ソフトウェアインストール**
```bash
# Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker raguser

# Docker Compose V2
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 基本ツール
apt install -y git vim curl wget htop
```

#### **Step 4: ドメイン設定**
```bash
# 推奨ドメインサービス
1. お名前.com（国内、UIが分かりやすい）
2. Cloudflare（海外、安価・高機能）
3. Google Domains（簡単設定）

# ドメイン例
your-name-rag.com
your-project-api.dev
rag-system.tokyo

# DNS設定（ドメイン管理画面で）
A レコード: @ → [VPS-IP-ADDRESS]
A レコード: www → [VPS-IP-ADDRESS]
```

### 🔐 SSL証明書設定（Let's Encrypt）

```bash
# Certbot インストール
apt install -y certbot python3-certbot-nginx

# Nginx インストール（先に基本設定）
apt install -y nginx

# 基本Nginx設定
vim /etc/nginx/sites-available/rag-api
---
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
---

# 設定有効化
ln -s /etc/nginx/sites-available/rag-api /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# SSL証明書取得
certbot --nginx -d your-domain.com -d www.your-domain.com

# 自動更新設定
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### 📁 プロジェクト配置設定

```bash
# 作業ディレクトリ作成
cd /home/raguser
mkdir -p rag-system
cd rag-system

# プロジェクトファイル転送（ローカルから）
# 方法1: Git clone（推奨）
git clone https://github.com/your-username/test_text_editor.git
cd test_text_editor/prj_vps_rag

# 方法2: SCP転送
# scp -P 22122 -r ./prj_vps_rag raguser@[VPS-IP]:/home/raguser/rag-system/

# 権限設定
chown -R raguser:raguser /home/raguser/rag-system
chmod -R 755 /home/raguser/rag-system
```

### 🌐 本番用設定ファイル

#### **docker-compose.prod.yml**
```yaml
version: '3.8'

services:
  rag-api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: rag-api-prod
    restart: unless-stopped
    ports:
      - "127.0.0.1:8001:8001"  # ローカルホストのみ
    volumes:
      - ./data/chromadb:/data/chromadb
      - ./logs:/app/logs
    environment:
      - ENV=production
      - API_SECRET_KEY=${API_SECRET_KEY}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - PYTHONUNBUFFERED=1
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    networks:
      - rag-network
    deploy:
      resources:
        limits:
          memory: 800M
        reservations:
          memory: 400M

networks:
  rag-network:
    driver: bridge

volumes:
  chromadb_data:
    driver: local
```

#### **本番用環境変数（.env.prod）**
```bash
# .env.prod
ENV=production
API_SECRET_KEY=your-strong-secret-key-here
GITHUB_TOKEN=ghp_your-github-token-here

# セキュリティ設定
PYTHONPATH=/app
PYTHONUNBUFFERED=1
```

### 🚀 デプロイ手順

#### **初回デプロイ**
```bash
# 1. 環境変数設定
cp .env.example .env.prod
vim .env.prod  # 本番用の値に変更

# 2. 本番ビルド・起動
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 3. 動作確認
curl http://localhost:8001/health
# {"status": "healthy"} が返ることを確認

# 4. 外部からの動作確認
curl https://your-domain.com/health
```

#### **更新デプロイ**
```bash
# コード更新
git pull origin main

# 再ビルド・再起動
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 動作確認
curl https://your-domain.com/health
```

### 📊 モニタリング・メンテナンス

#### **ログ確認**
```bash
# アプリケーションログ
docker-compose -f docker-compose.prod.yml logs -f rag-api

# システムリソース確認
htop
df -h
free -h

# Nginxログ
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

#### **バックアップ設定**
```bash
# ChromaDBデータバックアップスクリプト
vim /home/raguser/backup.sh
---
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/raguser/backups"
mkdir -p $BACKUP_DIR

# ChromaDBデータバックアップ
tar -czf $BACKUP_DIR/chromadb_$DATE.tar.gz -C /home/raguser/rag-system/data chromadb

# 古いバックアップ削除（30日より古い）
find $BACKUP_DIR -name "chromadb_*.tar.gz" -mtime +30 -delete
---

chmod +x /home/raguser/backup.sh

# 日次バックアップ設定
echo "0 2 * * * /home/raguser/backup.sh" | crontab -
```

### 🔧 トラブルシューティング

#### **よくある問題と解決法**

**1. ポート開放問題**
```bash
# ファイアウォール確認
ufw status
netstat -tulpn | grep :8001

# 解決法
ufw allow 8001/tcp  # 必要に応じて
```

**2. SSL証明書エラー**
```bash
# 証明書状態確認
certbot certificates

# 手動更新
certbot renew --dry-run
```

**3. Docker メモリ不足**
```bash
# メモリ使用量確認
docker stats

# 不要コンテナ削除
docker system prune -a
```

**4. ChromaDB データ問題**
```bash
# データ初期化（注意：全データ削除）
docker-compose -f docker-compose.prod.yml down
rm -rf ./data/chromadb/*
docker-compose -f docker-compose.prod.yml up -d
```

### 💡 最適化Tips

#### **パフォーマンス向上**
```bash
# 1. Swap設定（メモリ不足対策）
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 2. 自動起動設定
systemctl enable docker
systemctl enable nginx

# 3. プロセス監視（watchdog）
apt install -y supervisor
vim /etc/supervisor/conf.d/rag-api.conf
---
[program:rag-api]
command=docker-compose -f /home/raguser/rag-system/docker-compose.prod.yml up
directory=/home/raguser/rag-system
autostart=true
autorestart=true
user=raguser
---
```

### 📋 チェックリスト

#### **デプロイ前確認**
- [ ] SSH鍵認証設定済み
- [ ] ファイアウォール設定済み
- [ ] ドメイン取得・DNS設定済み
- [ ] SSL証明書取得済み
- [ ] 環境変数設定済み
- [ ] バックアップスクリプト設定済み

#### **デプロイ後確認**
- [ ] `curl https://your-domain.com/health` 成功
- [ ] RAG検索API動作確認
- [ ] ログ出力正常
- [ ] SSL証明書自動更新設定
- [ ] モニタリング設定完了

---

**ConoHa VPS推奨プラン**: 1GB (¥682/月) → 将来2GB (¥1,738/月) スケールアップ
**総構築時間**: 初回3-5時間、慣れれば1-2時間
**月額コスト**: ¥682 + ドメイン¥100-200 = 約¥800-900/月

---

**作成日**: 2025年1月20日
**決定事項**: VPS先行展開戦略採用、prj_text_editor_v2シンプル化方針、ConoHa VPS採用
**推奨VPS**: ConoHa VPS 1GB (¥682/月) → 2GB (¥1,738/月) スケールアップ
**目標期間**: VPS展開2週間 + フロント開発3週間 = 5週間で完成