# VPS RAG Server

GitHub リポジトリのドキュメントに対してセマンティック検索とAI会話を提供するRAGサーバー

## 🚀 クイックスタート（ローカル）

### 1. 環境変数設定
```bash
cp .env.example .env
# .envファイルを編集して以下を設定:
# - OPENAI_API_KEY
# - GITHUB_TOKEN
# - API_SECRET_KEY
```

### 2. Docker起動
```bash
# Docker Composeで起動
docker-compose up -d

# ログ確認
docker-compose logs -f
```

### 3. 動作確認
```bash
# ブラウザでSwagger UI確認
open http://localhost:8001/docs

# ヘルスチェック
curl http://localhost:8001/health
```

## 📝 API使用例

### REST Clientファイル（VSCode）
```http
# test.http
@baseUrl = http://localhost:8001
@token = test123

### 検索
POST {{baseUrl}}/api/search
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "query": "テスト検索",
  "repository": "wasborn14/test-editor",
  "limit": 5
}
```

### curlコマンド
```bash
# 検索API
curl -X POST http://localhost:8001/api/search \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"query":"検索クエリ","repository":"wasborn14/test-editor"}'
```

## 🏗️ プロジェクト構造
```
prj_vps_rag/
├── docker-compose.yml     # Docker設定
├── .env                   # 環境変数
├── api/
│   ├── Dockerfile        # APIコンテナ定義
│   ├── requirements.txt  # Python依存関係
│   ├── main.py          # FastAPIメインファイル
│   └── services/        # サービス層（実装予定）
├── data/
│   └── chromadb/        # ChromaDB永続化データ
└── nginx/               # Nginx設定（本番用）
```

## 🔧 開発

### ローカル開発（Dockerなし）
```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### テスト実行
```bash
# APIテスト
pytest api/tests/
```

## 📦 VPSデプロイ

### 1. VPSセットアップ
```bash
# Ubuntu 22.04
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose -y
```

### 2. プロジェクト転送
```bash
# ローカルから
rsync -avz ./prj_vps_rag/ user@vps-ip:/home/user/prj_vps_rag/
```

### 3. VPSで起動
```bash
ssh user@vps-ip
cd prj_vps_rag
docker-compose up -d
```

## 🔐 セキュリティ

- API_SECRET_KEY: ランダムな文字列を設定
- Tailscale推奨: VPN経由でアクセス
- HTTPS: Let's Encryptで証明書取得

## 📊 パフォーマンス

- 検索レスポンス: < 200ms
- 同時接続: 10ユーザー
- メモリ使用: < 1GB

## 🚧 TODO

- [ ] ChromaDB統合実装
- [ ] GitHub API同期機能
- [ ] OpenAI Embeddings統合
- [ ] RAGチャット機能
- [ ] Tailscale設定追加
- [ ] バッチ処理最適化

## 📄 ライセンス

MIT