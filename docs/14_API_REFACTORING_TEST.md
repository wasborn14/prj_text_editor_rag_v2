# API リファクタリング後のテスト手順

## 概要

main.py をルーター別にファイル分割したリファクタリング後の動作確認手順

## 1. ローカルテスト

### Docker 環境の再構築

```
cd /Users/estyle-0170/Environment/test/2025/09/prj_text_editor_rag_v1/backend

# 既存コンテナ停止・削除
docker-compose down

# キャッシュクリアしてリビルド
docker-compose build --no-cache

# 起動
docker-compose up -d

# ログ確認
docker-compose logs -f rag-api
```

### 基本動作確認

```
# ヘルスチェック
curl http://localhost:8001/health

# ルートエンドポイント
curl http://localhost:8001/

# Swagger UI確認
open http://localhost:8001/docs
```

### 各エンドポイントのテスト

#### 1. 同期エンドポイント

```
curl -X POST http://localhost:8001/api/sync \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "repository": "wasborn14/test-editor",
    "force": false
  }'
```

#### 2. 検索エンドポイント

```
curl -X POST http://localhost:8001/api/search \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "query": "プロジェクトの概要",
    "repository": "wasborn14/test-editor",
    "limit": 5
  }'
```

#### 3. ディレクトリ検索エンドポイント

```
curl -X POST http://localhost:8001/api/search/directory \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "query": "設定方法",
    "repository": "wasborn14/test-editor",
    "directory": "docs",
    "limit": 3
  }'
```

#### 4. リポジトリ構造取得

```
curl -X GET "http://localhost:8001/api/repository/structure?repo_name=wasborn14/test-editor" \
  -H 'Authorization: Bearer 4f5793c108119abe'
```

#### 5. チャットエンドポイント（モック）

```
curl -X POST http://localhost:8001/api/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "message": "このプロジェクトについて教えて",
    "repository": "wasborn14/test-editor",
    "context_limit": 3
  }'
```

## 2. VPS テスト

### 本番環境での再デプロイ

```
# VPSにSSH接続
ssh -i ~/.ssh/id_conoha_rag_202509 wasborn@160.251.211.37

# プロジェクトディレクトリに移動
cd /opt/prj_text_editor_rag_v1/backend

# 最新コードをプル
git pull origin main

# 本番環境再構築
sudo docker-compose -f docker-compose.prod.yml down
sudo docker-compose -f docker-compose.prod.yml build --no-cache
sudo docker-compose -f docker-compose.prod.yml up -d

# ログ確認
sudo docker-compose -f docker-compose.prod.yml logs -f rag-api
```

### VPS 動作確認

```
# ヘルスチェック
curl http://160.251.211.37/health

# 実際のAPIキーで同期テスト
curl -X POST http://160.251.211.37/api/sync \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "repository": "wasborn14/test-editor",
    "force": false
  }'

# 検索テスト
curl -X POST http://160.251.211.37/api/search \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "query": "VPS設定",
    "repository": "wasborn14/test-editor",
    "limit": 3
  }'
```

## 3. エラー対応

### よくあるエラーと対処法

#### ImportError: No module named 'routers'

```
# Pythonパス確認
docker-compose exec rag-api python -c "import sys; print(sys.path)"

# ディレクトリ構造確認
docker-compose exec rag-api ls -la /app/
docker-compose exec rag-api ls -la /app/routers/
```

#### ModuleNotFoundError: No module named 'models'

```
# __init__.py ファイル確認
docker-compose exec rag-api ls -la /app/models/__init__.py
docker-compose exec rag-api ls -la /app/routers/__init__.py
```

#### 認証エラー

```
# 環境変数確認
docker-compose exec rag-api env | grep RAG_API_KEY
```

## 4. 期待される結果

### 成功時のレスポンス例

#### 同期成功

```json
{
  "status": "success",
  "repository": "wasborn14/test-editor",
  "files_synced": 20,
  "message": "Successfully synced 20 files"
}
```

#### 検索成功

```
{
  "results": [
    {
      "content": "# VPS Setup Guide\n\nConoHa VPSでの環境構築手順...",
      "metadata": {
        "path": "docs/11_VPS_SETUP_GUIDE.md",
        "name": "11_VPS_SETUP_GUIDE.md",
        "chunk_index": 0
      },
      "score": 0.85
    }
  ],
  "total": 1
}
```

## 5. ChromaDB コレクション管理

### 保存されているコレクション確認

#### 全コレクション一覧取得

```
curl -X GET http://localhost:8001/api/admin/collections \
  -H 'Authorization: Bearer 4f5793c108119abe'
```

返却例：

```json
{
  "collections": [
    {
      "name": "repo_1234abcd",
      "probable_repo": "wasborn14/test-editor",
      "document_count": 15
    },
    {
      "name": "repo_5678efgh",
      "probable_repo": "wasborn14/prj_text_editor_rag_v1",
      "document_count": 20
    }
  ]
}
```

#### 特定リポジトリのデータ確認

```
# test-editorのデータ確認
curl -X GET "http://localhost:8001/api/admin/collection/wasborn14%2Ftest-editor/peek?limit=3" \
  -H 'Authorization: Bearer 4f5793c108119abe'

# prj_text_editor_rag_v1のデータ確認
curl -X GET "http://localhost:8001/api/admin/collection/wasborn14%2Fprj_text_editor_rag_v1/peek?limit=3" \
  -H 'Authorization: Bearer 4f5793c108119abe'
```

#### 不要なコレクション削除

```
# 特定コレクション削除（ハッシュ名を指定）
curl -X DELETE "http://localhost:8001/api/admin/collections/repo_6b4b5e04" \
  -H 'Authorization: Bearer 4f5793c108119abe'
```

#### 全データクリア（開発時のみ）

```
# Dockerボリューム削除で全データクリア
docker-compose down -v
docker-compose up -d
```

### VPS での確認

```
# VPSでコレクション一覧確認
curl -X GET http://160.251.211.37/api/admin/collections \
  -H 'Authorization: Bearer 4f5793c108119abe'

# 特定リポジトリのデータ確認
curl -X GET "http://160.251.211.37/api/admin/collection/wasborn14%2Ftest-editor/peek" \
  -H 'Authorization: Bearer 4f5793c108119abe'
```

## 6. パフォーマンス確認

### レスポンス時間測定

```
# 同期処理時間
time curl -X POST http://160.251.211.37/api/sync \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{"repository": "wasborn14/test-editor"}'

# 検索処理時間
time curl -X POST http://160.251.211.37/api/search \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{"query": "Docker設定", "repository": "wasborn14/test-editor"}'
```

### リソース使用量確認

```
# コンテナ統計
sudo docker stats rag-api-prod

# メモリ使用量
sudo docker-compose -f docker-compose.prod.yml exec rag-api free -h

# ディスク使用量
sudo docker-compose -f docker-compose.prod.yml exec rag-api df -h
```

## まとめ

リファクタリング後も全てのエンドポイントが正常に動作することを確認してください。

### 基本機能

- ✅ ヘルスチェック
- ✅ 同期機能
- ✅ 検索機能
- ✅ ディレクトリ検索
- ✅ リポジトリ構造取得
- ✅ チャット機能（モック）

### 管理機能

- ✅ コレクション一覧確認
- ✅ リポジトリデータ確認
- ✅ 不要なコレクション削除

エラーが発生した場合は、Docker ログとエラーメッセージを確認して対処してください。
