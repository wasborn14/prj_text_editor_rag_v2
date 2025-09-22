# Docker & API 基本コマンドガイド

## Docker イメージビルド手順

### ローカル開発環境

```bash
# プロジェクトディレクトリに移動
cd /Users/estyle-0170/Environment/test/2025/09/prj_text_editor_rag_v1/backend

# 通常のビルド・起動
docker-compose up -d

# キャッシュなしで完全再ビルド
docker-compose build --no-cache
docker-compose up -d

# 特定サービスのみ再ビルド
docker-compose build --no-cache api
docker-compose restart api

# ログ確認
docker-compose logs -f api
docker-compose logs -f chromadb

# 停止・削除
docker-compose down
docker-compose down -v  # ボリュームも削除
```

### VPS 本番環境

```bash
# VPS接続
ssh root@160.251.211.37

# プロジェクトディレクトリに移動
cd /opt/prj_text_editor_rag_v1/backend

# 通常のビルド・起動
docker-compose -f docker-compose.prod.yml up -d

# キャッシュなしで完全再ビルド
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# 特定サービスのみ再ビルド
docker-compose -f docker-compose.prod.yml build --no-cache api
docker-compose -f docker-compose.prod.yml restart api

# ログ確認
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f chromadb

# 状態確認
docker-compose -f docker-compose.prod.yml ps

# 停止・削除
docker-compose -f docker-compose.prod.yml down
```

## API 基本コマンド

### ローカル環境 (localhost:8001)

#### ヘルスチェック

```bash
curl http://localhost:8001/health
```

#### リポジトリ同期

```bash
curl -X POST http://localhost:8001/api/sync \
  -H "Authorization: Bearer 4f5793c108119abe" \
  -H "Content-Type: application/json" \
  -d '{"repository": "wasborn14/test-editor-docs"}'
```

#### 検索

```bash
curl -X POST http://localhost:8001/api/search \
  -H "Authorization: Bearer 4f5793c108119abe" \
  -H "Content-Type: application/json" \
  -d '{"query": "rag-apiのポート番号", "repository": "wasborn14/test-editor-docs"}'
```

#### チャット

```bash
curl -X POST http://localhost:8001/api/chat \
  -H "Authorization: Bearer 4f5793c108119abe" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "RAGシステムについて教えて",
    "repository": "wasborn14/test-editor-docs",
    "context_limit": 5
  }'
```

#### 管理者機能

```bash
# コレクション一覧
curl -X GET http://localhost:8001/api/admin/collections \
  -H "Authorization: Bearer 4f5793c108119abe"

# 特定コレクション情報
curl -X GET http://localhost:8001/api/admin/collections/wasborn14%2Ftest-editor-docs/info \
  -H "Authorization: Bearer 4f5793c108119abe"

# コレクション削除
curl -X DELETE http://localhost:8001/api/admin/collections/wasborn14%2Ftest-editor-docs \
  -H "Authorization: Bearer 4f5793c108119abe"
```

### VPS 環境 (160.251.211.37)

#### ヘルスチェック

```bash
curl http://160.251.211.37:8001/health
```

#### リポジトリ同期

```bash
curl -X POST http://160.251.211.37:8001/api/sync \
  -H "Authorization: Bearer 4f5793c108119abe" \
  -H "Content-Type: application/json" \
  -d '{"repository": "wasborn14/test-editor-docs"}'
```

#### 検索

```bash
curl -X POST http://160.251.211.37:8001/api/search \
  -H "Authorization: Bearer 4f5793c108119abe" \
  -H "Content-Type: application/json" \
  -d '{"query": "rag-apiのポート番号", "repository": "wasborn14/test-editor-docs"}'
```

#### チャット

```bash
curl -X POST http://160.251.211.37:8001/api/chat \
  -H "Authorization: Bearer 4f5793c108119abe" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "RAGシステムについて教えて",
    "repository": "wasborn14/test-editor-docs",
    "context_limit": 5
  }'
```

#### 管理者機能

```bash
# コレクション一覧
curl -X GET http://160.251.211.37:8001/api/admin/collections \
  -H "Authorization: Bearer 4f5793c108119abe"

# 特定コレクション情報
curl -X GET http://160.251.211.37:8001/api/admin/collections/wasborn14%2Ftest-editor-docs/info \
  -H "Authorization: Bearer 4f5793c108119abe"

# コレクション削除
curl -X DELETE http://160.251.211.37:8001/api/admin/collections/wasborn14%2Ftest-editor-docs \
  -H "Authorization: Bearer 4f5793c108119abe"
```

## ChromaDB データリセット

### ローカル環境

```bash
# ChromaDBデータ削除
rm -rf /Users/estyle-0170/Environment/test/2025/09/prj_text_editor_rag_v1/backend/data/chromadb/*

# コンテナ再起動
cd /Users/estyle-0170/Environment/test/2025/09/prj_text_editor_rag_v1/backend
docker-compose restart chromadb api
```

### VPS 環境

```bash
# VPSでChromeDBデータ削除
ssh root@160.251.211.37
rm -rf /opt/prj_text_editor_rag_v1/backend/data/chromadb/*

# コンテナ再起動
cd /opt/prj_text_editor_rag_v1/backend
docker-compose -f docker-compose.prod.yml restart chromadb api
```

## 環境変数確認

### ローカル環境

```bash
# .envファイル確認
cat /Users/estyle-0170/Environment/test/2025/09/prj_text_editor_rag_v1/backend/.env

# コンテナ内環境変数確認
docker-compose exec api env | grep -E "(RAG_|GITHUB_|OPENAI_)"
```

### VPS 環境

```bash
# .env.prodファイル確認
ssh root@160.251.211.37
cat /opt/prj_text_editor_rag_v1/backend/.env.prod

# コンテナ内環境変数確認
docker-compose -f docker-compose.prod.yml exec api env | grep -E "(RAG_|GITHUB_|OPENAI_)"
```

## デバッグコマンド

### Docker コンテナ状態確認

```bash
# ローカル
docker-compose ps
docker-compose logs --tail=50 api

# VPS
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs --tail=50 api
```

### ChromaDB 直接確認

```bash
# ローカル
curl http://localhost:8000/api/v1/heartbeat
curl http://localhost:8000/api/v1/collections

# VPS
curl http://160.251.211.37:8000/api/v1/heartbeat
curl http://160.251.211.37:8000/api/v1/collections
```

### ディスク使用量確認

```bash
# Docker使用量
docker system df

# データディレクトリ使用量
du -sh backend/data/

# 全体ディスク使用量
df -h
```

## トラブルシューティング

### よくある問題と解決法

#### 1. ポート競合

```bash
# ポート使用状況確認
netstat -tlnp | grep 8001
lsof -i :8001

# プロセス停止
sudo kill -9 $(lsof -t -i:8001)
```

#### 2. 権限エラー

```bash
# データディレクトリ権限修正
sudo chown -R $USER:$USER backend/data/
```

#### 3. メモリ不足

```bash
# Docker未使用リソース削除
docker system prune -f
docker volume prune -f
docker image prune -a -f
```

#### 4. 依存関係エラー

```bash
# 完全再ビルド
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 推奨ワークフロー

### 1. 新機能開発時

```bash
# ローカルで開発
cd backend
docker-compose up -d
# 開発・テスト
docker-compose logs -f api
```

### 2. VPS デプロイ時

```bash
# ローカルでコミット
git add .
git commit -m "feature: 新機能追加"
git push origin main

# VPSで更新
ssh root@160.251.211.37
cd /opt/prj_text_editor_rag_v1
git pull origin main
cd backend
docker-compose -f docker-compose.prod.yml build --no-cache api
docker-compose -f docker-compose.prod.yml restart api
```

### 3. ChromaDB 更新時

```bash
# データリセット
rm -rf backend/data/chromadb/*
docker-compose restart chromadb api

# 再同期
curl -X POST http://localhost:8001/api/sync \
  -H "Authorization: Bearer 4f5793c108119abe" \
  -H "Content-Type: application/json" \
  -d '{"repository": "wasborn14/test-editor-docs"}'
```
