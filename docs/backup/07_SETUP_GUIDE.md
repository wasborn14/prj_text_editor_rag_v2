# VPS RAG ローカルテスト手順

## 📋 前提条件

- Docker Desktop がインストール済み
- GitHubアカウントとPersonal Access Token
- VSCode（推奨）

## 🚀 セットアップ手順

### 1. 環境変数設定

```bash
# プロジェクトディレクトリに移動
cd /Users/estyle-0170/Environment/test/2025/09/test_text_editor/prj_vps_rag

# .envファイル作成
cp .env.example .env

# .envファイルを編集
code .env  # またはお好みのエディタで開く
```

**.env の設定内容:**

```env
# GitHub Personal Access Token（必須）
# https://github.com/settings/tokens から作成
# 権限: repo（Full control of private repositories）
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxx

# API認証キー（任意の文字列でOK）
API_SECRET_KEY=test123

# OpenAI APIキー（現時点では不要、後で必要）
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxx

# ChromaDB設定（デフォルトのままでOK）
CHROMA_HOST=chromadb
CHROMA_PORT=8000
```

### 2. Docker コンテナ起動

```bash
# Dockerが起動していることを確認
docker --version
# 出力例: Docker version 24.0.7, build afdd53b

# コンテナをバックグラウンドで起動
docker-compose up -d

# 起動状態確認（両方のコンテナがUpになっていることを確認）
docker-compose ps
# 出力例:
# NAME                 SERVICE      STATUS      PORTS
# chromadb-local      chromadb     Up          0.0.0.0:8000->8000/tcp
# rag-api-local       rag-api      Up          0.0.0.0:8001->8000/tcp

# ログ確認（エラーがないことを確認）
docker-compose logs -f
# Ctrl+C でログ表示を終了
```

### 3. API動作確認

```bash
# ヘルスチェック（認証不要）
curl http://localhost:8001/health

# 期待される出力:
# {"status":"healthy"}

# API情報確認
curl http://localhost:8001/

# 期待される出力:
# {
#   "name": "VPS RAG API",
#   "version": "1.0.0",
#   "status": "running",
#   "docs": "/docs"
# }
```

### 4. GitHub リポジトリ同期

```bash
# GitHubリポジトリからMarkdownファイルを取得してChromaDBに保存
curl -X POST http://localhost:8001/api/sync \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "wasborn14/test-editor",
    "force": false
  }'

# 成功時の出力例:
# {
#   "status": "success",
#   "repository": "wasborn14/test-editor",
#   "files_synced": 5,
#   "message": "Successfully synced 5 files"
# }

# 別のリポジトリも同期可能（例：公開リポジトリ）
curl -X POST http://localhost:8001/api/sync \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"repository": "facebook/react"}'
```

### 5. 検索機能テスト

```bash
# 同期したリポジトリ内を検索
curl -X POST http://localhost:8001/api/search \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "テスト",
    "repository": "wasborn14/test-editor",
    "limit": 3
  }'

# 検索結果の例:
# {
#   "results": [
#     {
#       "content": "Supabase認証の実装...",
#       "metadata": {
#         "path": "README.md",
#         "name": "README.md",
#         "sha": "abc123..."
#       },
#       "score": 0.89
#     }
#   ],
#   "total": 3
# }
```

## 🎯 便利な使い方

### VSCode REST Client を使用

1. VSCodeで拡張機能をインストール:
```bash
code --install-extension humao.rest-client
```

2. プロジェクトをVSCodeで開く:
```bash
code /Users/estyle-0170/Environment/test/2025/09/test_text_editor/prj_vps_rag
```

3. `test.http`ファイルを開く

4. 各リクエストの上にある「Send Request」をクリックして実行

### Swagger UI を使用（GUI）

1. ブラウザで開く:
```bash
open http://localhost:8001/docs
```

2. 認証設定:
   - 右上の「Authorize」ボタンをクリック
   - Value欄に「test123」を入力
   - 「Authorize」をクリック

3. 各APIエンドポイントをテスト:
   - エンドポイントを展開
   - 「Try it out」をクリック
   - パラメータを入力
   - 「Execute」をクリック

## 🐛 トラブルシューティング

### Dockerコンテナが起動しない

```bash
# コンテナを停止して削除
docker-compose down -v

# イメージを再ビルド
docker-compose build --no-cache

# 再起動
docker-compose up -d
```

### ポート競合エラー（8000/8001が使用中）

```bash
# 使用中のプロセスを確認
lsof -i :8000
lsof -i :8001

# プロセスを停止
kill -9 [PID]

# またはポートを変更（docker-compose.ymlを編集）
# ports:
#   - "8002:8000"  # 8000 → 8002に変更
```

### GitHub API認証エラー

```bash
# トークンの確認
cat .env | grep GITHUB_TOKEN

# トークンの権限確認
# https://github.com/settings/tokens で確認
# 必要な権限: repo (Full control of private repositories)
```

### ChromaDB接続エラー

```bash
# ChromaDBコンテナのログ確認
docker-compose logs chromadb

# データボリュームをリセット
docker-compose down
rm -rf data/chromadb/*
docker-compose up -d
```

### API認証エラー（401 Unauthorized）

```bash
# .envファイルの確認
cat .env | grep API_SECRET_KEY

# Authorizationヘッダーの確認
# Bearer の後にスペースが必要
# 正: "Authorization: Bearer test123"
# 誤: "Authorization: Bearertest123"
```

## 📊 パフォーマンステスト

### 同期速度確認

```bash
# timeコマンドで測定
time curl -X POST http://localhost:8001/api/sync \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"repository":"estyle-0170/test_text_editor"}'

# 期待値: 10ファイルで < 5秒
```

### 検索速度確認

```bash
# 検索レスポンス時間測定
time curl -X POST http://localhost:8001/api/search \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"query":"test","repository":"estyle-0170/test_text_editor"}'

# 期待値: < 200ms
```

## 🚀 次のステップ

### 基本機能の改善
- [ ] 再帰的にサブディレクトリも探索
- [ ] より多くのファイルを同期（現在は10ファイル制限）
- [ ] ファイル更新の差分同期

### 高度な機能追加
- [ ] OpenAI Embeddings統合（より精度の高い検索）
- [ ] ストリーミング応答対応
- [ ] WebSocket対応（リアルタイム検索）

### 本番環境準備
- [ ] VPSへのデプロイスクリプト作成
- [ ] Tailscale VPN設定
- [ ] SSL/TLS証明書設定
- [ ] バックアップ自動化

## 📝 コマンドエイリアス設定（オプション）

`.bashrc` または `.zshrc` に追加:

```bash
# RAG API エイリアス
export RAG_URL="http://localhost:8001"
export RAG_TOKEN="test123"

# 同期コマンド
alias rag-sync='function _sync() {
  curl -X POST $RAG_URL/api/sync \
    -H "Authorization: Bearer $RAG_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"repository\":\"$1\"}" | jq
}; _sync'

# 検索コマンド
alias rag-search='function _search() {
  curl -X POST $RAG_URL/api/search \
    -H "Authorization: Bearer $RAG_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$1\",\"repository\":\"$2\"}" | jq
}; _search'

# 使用例:
# rag-sync "estyle-0170/test_text_editor"
# rag-search "Supabase" "estyle-0170/test_text_editor"
```

## 📞 サポート

問題が解決しない場合:
1. `docker-compose logs` で詳細なエラーログを確認
2. GitHubのIssuesで報告
3. .envファイルの設定を再確認（特にトークン）

---

最終更新: 2025/01/20