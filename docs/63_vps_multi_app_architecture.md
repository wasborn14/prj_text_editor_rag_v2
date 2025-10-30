# VPS共通基盤 - マルチアプリケーション両立案

## 概要

ConoHa VPS（160.251.211.37）を複数アプリケーションで共通利用する構成。現在のMarkdown Editor RAG（prj_text_editor_rag_v2）と、新規の音声営業支援AI（VoiceSales AI）を同一VPS上で稼働させる。

## 現状の構成

### 既存アプリ: Markdown Editor RAG

- **リポジトリ**: wasborn14/prj_text_editor_rag_v2
- **バックエンド**: FastAPI + ChromaDB
- **ポート**: 8001（ローカルホスト）
- **データ**: /opt/prj_text_editor_rag_v2/backend/data/
- **用途**: GitHub リポジトリのマークダウンファイルRAG検索

### 新規アプリ: VoiceSales AI

- **説明**: 保険営業担当者向け音声支援アプリ（[62_plan.md](62_plan.md)）
- **バックエンド**: Next.js API Routes（サーバーレス想定）
- **フロントエンド**: Next.js 14 + Vercel
- **外部API**: OpenRouter、Supabase、Pinecone

## 共通VPS両立アーキテクチャ

### 1. VPSリソース割り当て

**VPSスペック**: 2Core / 1GB RAM / 100GB SSD

| アプリケーション | メモリ | CPU | ストレージ |
|-----------------|--------|-----|-----------|
| Markdown Editor RAG | 800MB | 1Core | 20GB |
| VoiceSales AI Backend | 200MB | 0.5Core | 5GB |
| Nginx (リバースプロキシ) | 50MB | 0.2Core | 1GB |
| System Reserved | 150MB | 0.3Core | 74GB |

### 2. ポート割り当て

| アプリケーション | 内部ポート | 外部URL |
|-----------------|-----------|---------|
| Markdown Editor RAG | 8001 | https://vps.example.com/api/editor/ |
| VoiceSales AI Backend | 8002 | https://vps.example.com/api/voice/ |
| Nginx (HTTPS) | 443 | https://vps.example.com/ |

### 3. ディレクトリ構成

```
/opt/
├── prj_text_editor_rag_v2/          # 既存: Markdown Editor
│   ├── backend/
│   │   ├── api/                      # FastAPI
│   │   ├── data/chromadb/            # ChromaDB データ
│   │   ├── docker-compose.prod.yml   # ポート 8001
│   │   └── .env.prod
│   └── frontend/                     # Vercelデプロイ
│
├── voicesales_ai/                    # 新規: 音声営業支援
│   ├── backend/
│   │   ├── api/                      # Next.js API Routes（VPS用）
│   │   ├── docker-compose.prod.yml   # ポート 8002
│   │   └── .env.prod
│   └── frontend/                     # Vercelデプロイ
│
└── nginx/                            # 共通リバースプロキシ
    ├── nginx.conf
    ├── sites-available/
    │   ├── editor.conf
    │   └── voice.conf
    └── ssl/
        ├── cert.pem
        └── key.pem
```

### 4. Nginxリバースプロキシ設定

#### `/etc/nginx/nginx.conf`（マスター設定）

```nginx
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    # 基本設定
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    # GZIP圧縮
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript;

    # サイト設定読み込み
    include /etc/nginx/sites-enabled/*;
}
```

#### `/etc/nginx/sites-available/vps-apps.conf`

```nginx
# アップストリーム定義
upstream editor_backend {
    server 127.0.0.1:8001;
}

upstream voice_backend {
    server 127.0.0.1:8002;
}

# HTTPからHTTPSへリダイレクト
server {
    listen 80;
    server_name vps.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS メインサーバー
server {
    listen 443 ssl http2;
    server_name vps.example.com;

    # SSL証明書（Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/vps.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vps.example.com/privkey.pem;

    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Markdown Editor RAG API
    location /api/editor/ {
        proxy_pass http://editor_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # タイムアウト設定（RAG検索用）
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # VoiceSales AI API
    location /api/voice/ {
        proxy_pass http://voice_backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # タイムアウト設定（AI回答生成用）
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # ヘルスチェック用エンドポイント
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # デフォルト（404）
    location / {
        return 404 "API endpoint not found. Use /api/editor/ or /api/voice/";
        add_header Content-Type text/plain;
    }
}
```

有効化:
```bash
sudo ln -s /etc/nginx/sites-available/vps-apps.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Docker Compose設定

#### Markdown Editor RAG（既存）

**backend/docker-compose.prod.yml** - 変更なし:

```yaml
services:
  rag-api:
    build:
      context: ./api
    container_name: rag-api-prod
    command: uvicorn main:app --host 0.0.0.0 --port 8001
    restart: unless-stopped
    ports:
      - "127.0.0.1:8001:8001"
    volumes:
      - ./data/chromadb:/data/chromadb
    env_file:
      - .env.prod
    deploy:
      resources:
        limits:
          memory: 800M
```

#### VoiceSales AI（新規）

**voicesales_ai/backend/docker-compose.prod.yml**:

```yaml
services:
  voice-api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: voice-api-prod
    command: node server.js
    restart: unless-stopped
    ports:
      - "127.0.0.1:8002:8002"
    volumes:
      - ./logs:/app/logs
    env_file:
      - .env.prod
    environment:
      - NODE_ENV=production
      - PORT=8002
    deploy:
      resources:
        limits:
          memory: 200M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - voice-network

networks:
  voice-network:
    driver: bridge
```

### 6. VoiceSales AI Backend実装方針

#### オプション A: Next.js Standalone on VPS（推奨）

**メリット**:
- API RoutesをVPS上で直接実行
- Vercel無料枠を節約（Serverless Function実行時間）
- レスポンス速度向上（VPS内部で処理）

**デメリット**:
- VPSメモリ消費（200MB程度）

**実装**:

```dockerfile
# voicesales_ai/backend/api/Dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係コピー
COPY package*.json ./
RUN npm ci --production

# アプリコピー
COPY . .

# Next.js ビルド（Standalone mode）
RUN npm run build

EXPOSE 8002

CMD ["node", ".next/standalone/server.js"]
```

**next.config.js**:

```javascript
module.exports = {
  output: 'standalone',
  // API RoutesのみをVPSで実行
  rewrites: async () => [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8002/api/:path*',
    },
  ],
};
```

#### オプション B: Express.js カスタムサーバー（軽量版）

**メリット**:
- メモリ使用量最小（100MB以下）
- シンプルな実装

**デメリット**:
- Next.jsの機能を使えない

**実装**:

```javascript
// voicesales_ai/backend/api/server.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.post('/api/chat', require('./routes/chat'));
app.get('/api/customers', require('./routes/customers'));
app.post('/api/customers', require('./routes/customers'));
app.post('/api/meetings', require('./routes/meetings'));

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.listen(8002, () => {
  console.log('VoiceSales API running on port 8002');
});
```

### 7. デプロイフロー

#### Markdown Editor RAG（既存）

```bash
# ローカルから実行
cd /path/to/prj_text_editor_rag_v2
./deployment/scripts/deploy_vps.sh
```

#### VoiceSales AI（新規）

**deployment/scripts/deploy_voice_vps.sh**:

```bash
#!/bin/bash

VPS_HOST="root@160.251.211.37"
DEPLOY_DIR="/opt/voicesales_ai"

echo "🚀 VoiceSales AI デプロイ開始..."

# 1. VPS上でGit Pull
ssh $VPS_HOST << 'EOF'
cd /opt/voicesales_ai
git pull origin main
EOF

# 2. Dockerビルド＆再起動
ssh $VPS_HOST << 'EOF'
cd /opt/voicesales_ai/backend
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
EOF

# 3. ヘルスチェック
sleep 10
ssh $VPS_HOST << 'EOF'
curl -f http://localhost:8002/health || exit 1
EOF

echo "✅ デプロイ完了！"
```

### 8. モニタリング・運用

#### リソース監視

```bash
# メモリ使用量確認
docker stats

# コンテナ別メモリ
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}"

# システム全体
free -h
htop
```

#### ログ確認

```bash
# Markdown Editor RAG
docker logs rag-api-prod -f

# VoiceSales AI
docker logs voice-api-prod -f

# Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

#### アプリケーション再起動

```bash
# Editor RAG のみ再起動
cd /opt/prj_text_editor_rag_v2/backend
docker-compose -f docker-compose.prod.yml restart

# VoiceSales のみ再起動
cd /opt/voicesales_ai/backend
docker-compose -f docker-compose.prod.yml restart

# Nginx 再起動
sudo systemctl restart nginx
```

### 9. セキュリティ対策

#### ファイアウォール設定

```bash
# UFWでポート制限
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw deny 8001         # 内部ポート（外部アクセス禁止）
sudo ufw deny 8002         # 内部ポート（外部アクセス禁止）
sudo ufw enable
```

#### API認証（両アプリ共通）

**Bearerトークン認証**:

```bash
# Editor RAG
curl https://vps.example.com/api/editor/search \
  -H "Authorization: Bearer YOUR_TOKEN"

# VoiceSales AI
curl https://vps.example.com/api/voice/chat \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 環境変数管理

```bash
# Editor RAG
/opt/prj_text_editor_rag_v2/backend/.env.prod

# VoiceSales AI
/opt/voicesales_ai/backend/.env.prod
```

**絶対にGitにコミットしない**:

```gitignore
# 両アプリの .gitignore に追加
.env.prod
*.env.prod
```

### 10. バックアップ戦略

#### データバックアップ

```bash
# Editor RAG - ChromaDB
tar -czf editor_chromadb_backup_$(date +%Y%m%d).tar.gz \
  /opt/prj_text_editor_rag_v2/backend/data/chromadb

# VoiceSales AI - Logs
tar -czf voice_logs_backup_$(date +%Y%m%d).tar.gz \
  /opt/voicesales_ai/backend/logs

# バックアップ先（ローカルまたはS3）
scp *.tar.gz user@backup-server:/backups/
```

#### 定期バックアップ（cron）

```bash
# /etc/cron.d/vps-backup
0 2 * * * root /opt/scripts/backup_all.sh
```

**backup_all.sh**:

```bash
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Editor RAG データ
docker cp rag-api-prod:/data/chromadb $BACKUP_DIR/editor_chromadb

# VoiceSales ログ
docker cp voice-api-prod:/app/logs $BACKUP_DIR/voice_logs

# 古いバックアップ削除（30日以上前）
find /backups -type d -mtime +30 -exec rm -rf {} \;
```

### 11. スケーリング戦略

#### 将来的なアプリ追加

**アプリ3号機: 例「Customer Support AI」**

```nginx
# /etc/nginx/sites-available/vps-apps.conf に追加
upstream support_backend {
    server 127.0.0.1:8003;
}

location /api/support/ {
    proxy_pass http://support_backend/;
    # 他の設定は同様
}
```

**ポート・メモリ割り当て**:

| アプリ | ポート | メモリ |
|-------|--------|--------|
| Editor RAG | 8001 | 600MB↓ |
| VoiceSales AI | 8002 | 150MB↓ |
| Customer Support AI | 8003 | 150MB |
| System Reserved | - | 100MB |

#### VPSアップグレード基準

**現在**: 2Core/1GB
**アップグレード判断**:

- メモリ使用率が常時80%以上
- CPU使用率が常時70%以上
- レスポンス時間が目標値の2倍以上

**推奨プラン**: 4Core/2GB（月額+1000円程度）

### 12. コスト試算

| 項目 | 月額費用 |
|------|---------|
| ConoHa VPS (2Core/1GB) | ¥968 |
| ドメイン（.com） | ¥100 |
| SSL証明書（Let's Encrypt） | ¥0 |
| **合計** | **¥1,068** |

**複数アプリ共有でのコストメリット**:

- 各アプリ専用VPSの場合: ¥968 × 2 = **¥1,936**
- 共通VPS利用: **¥1,068**（**¥868 節約/月**）

### 13. トラブルシューティング

#### メモリ不足エラー

```bash
# 症状: コンテナが頻繁に再起動
docker logs rag-api-prod | grep "OOM"

# 対処:
# 1. 不要なコンテナを停止
docker-compose -f docker-compose.prod.yml down

# 2. メモリ制限を調整（docker-compose.prod.yml）
deploy:
  resources:
    limits:
      memory: 600M  # 800M → 600M に削減
```

#### Nginx 502 Bad Gateway

```bash
# 症状: /api/editor/ が 502 エラー

# 原因確認:
curl http://localhost:8001/health  # コンテナが応答しているか確認

# 対処:
docker-compose -f docker-compose.prod.yml restart
sudo nginx -t && sudo systemctl reload nginx
```

#### ポート競合

```bash
# 症状: docker-compose up 時に "port already in use"

# 原因確認:
sudo lsof -i :8001
sudo lsof -i :8002

# 対処:
# 他のプロセスがポートを使用している場合は停止
sudo kill -9 <PID>
```

## まとめ

### 実装ステップ

1. **Nginx設定追加**（30分）
   - `/etc/nginx/sites-available/vps-apps.conf` 作成
   - SSL証明書取得（Let's Encrypt）
   - 設定有効化＆再起動

2. **VoiceSales AI バックエンド構築**（2時間）
   - Next.js Standalone または Express.js 選択
   - Dockerfile作成
   - docker-compose.prod.yml作成

3. **デプロイスクリプト作成**（30分）
   - deploy_voice_vps.sh作成
   - 権限付与＆テスト実行

4. **モニタリング設定**（30分）
   - リソース監視ダッシュボード
   - アラート設定（メモリ80%超え時）

5. **バックアップ自動化**（30分）
   - backup_all.sh作成
   - cronジョブ登録

### 想定される課題

| 課題 | 影響 | 対策 |
|------|------|------|
| メモリ不足 | 中 | 不要なコンテナ停止、VPSアップグレード |
| ポート競合 | 低 | ポート管理表の作成 |
| SSL証明書更新漏れ | 高 | Let's Encrypt自動更新設定 |
| バックアップ失敗 | 中 | 成功/失敗通知メール送信 |

### 次のアプリ追加時の手順

1. ポート番号割り当て（8003, 8004...）
2. Nginx設定に `location /api/newapp/` 追加
3. Docker Compose作成（メモリ制限設定）
4. デプロイスクリプト作成
5. 全体のメモリ使用量確認（80%以下に保つ）

---

## 関連ドキュメント

- [62_plan.md](62_plan.md) - VoiceSales AI 要件定義
- [CLAUDE.md](../CLAUDE.md) - Editor RAG プロジェクト概要
- [11_VPS_SETUP_GUIDE.md](11_VPS_SETUP_GUIDE.md) - VPS初期セットアップ（既存）

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0 | 2025-01-30 | 初版作成 |
