# RAG-Powered Markdown Editor

VPS RAGバックエンドとNext.jsフロントエンドを組み合わせたMarkdownエディタープロジェクト

## 🏗️ アーキテクチャ

- **Backend**: FastAPI + ChromaDB (VPS展開)
- **Frontend**: Next.js + TypeScript (開発予定)
- **RAG**: セマンティック検索とGitHub統合
- **Deployment**: Docker + Nginx + SSL

## 📁 プロジェクト構成

```
prj_text_editor_rag_v1/
├── backend/              # VPS RAGシステム
│   ├── api/              # FastAPI アプリケーション
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── data/             # ChromaDB データ
├── frontend/             # Next.jsフロントエンド (開発予定)
├── shared/               # 共通型定義・ユーティリティ
│   ├── types/            # TypeScript型定義
│   └── utils/            # 共通定数・ユーティリティ
├── docs/                 # プロジェクトドキュメント
└── deployment/           # VPS展開スクリプト・設定
    ├── scripts/          # デプロイメントスクリプト
    └── nginx/            # Nginx設定
```

## 🚀 クイックスタート

### VPS展開
```bash
# 1. リポジトリクローン
git clone https://github.com/your-username/prj_text_editor_rag_v1.git
cd prj_text_editor_rag_v1

# 2. VPS展開スクリプト実行
chmod +x deployment/scripts/deploy_vps.sh
./deployment/scripts/deploy_vps.sh

# 3. 環境変数設定後、再度実行
# .env.prod を編集してから再実行
```

### ローカル開発
```bash
# バックエンド起動
cd backend
docker-compose up -d

# APIテスト
curl http://localhost:8001/health
curl http://localhost:8001/

# 検索テスト
curl -X POST http://localhost:8001/api/search \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"query": "useAutoSync", "repository": "wasborn14/test-editor"}'
```

## 🔧 開発環境要件

- **Backend**: Python 3.11+, Docker & Docker Compose
- **Frontend**: Node.js 18+ (将来実装)
- **VPS**: Ubuntu 22.04 LTS, 1GB+ RAM

## 📊 API エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/health` | GET | ヘルスチェック |
| `/` | GET | API情報 |
| `/api/search` | POST | セマンティック検索 |
| `/api/search/directory` | POST | ディレクトリ検索 |
| `/api/sync` | POST | リポジトリ同期 |
| `/api/repository/structure` | GET | リポジトリ構造取得 |

## 📖 ドキュメント

詳細な設定手順は [docs/](./docs/) ディレクトリを参照してください：

- [**VPS展開ガイド**](./docs/10_VPS_DEPLOYMENT_FIRST_STRATEGY.md) - VPS設定と展開手順
- [**RAGテストガイド**](./docs/08_VPS_RAG_TESTING_GUIDE.md) - 機能テストと使用方法
- [**LangChain移行計画**](./docs/09_LANGCHAIN_MIGRATION_PLAN.md) - 将来の拡張計画

## 🎯 ロードマップ

### Phase 1: VPS RAG (完了)
- ✅ FastAPI + ChromaDB実装
- ✅ GitHub API統合
- ✅ セマンティック検索
- ✅ Docker化・VPS展開

### Phase 2: フロントエンド (開発予定)
- [ ] Next.js + TypeScript セットアップ
- [ ] CodeMirror エディター統合
- [ ] RAG API連携UI
- [ ] 認証・ユーザー管理

### Phase 3: 高度機能 (将来)
- [ ] LangChain統合
- [ ] リアルタイム同期
- [ ] マルチユーザー対応
- [ ] Azure移行

## 📄 ライセンス

MIT License

## 🙏 謝辞

- [FastAPI](https://fastapi.tiangolo.com/)
- [ChromaDB](https://www.trychroma.com/)
- [Next.js](https://nextjs.org/)
- [PyGithub](https://github.com/PyGithub/PyGithub)