# Claude Session Handover Document
## プロジェクト引き継ぎ情報

作成日時: 2025-09-21
対象プロジェクト: `prj_text_editor_rag_v1`

---

## 🎯 プロジェクト概要

**VPS RAG-powered Markdown Editor** の開発プロジェクト

- **バックエンド**: FastAPI + ChromaDB (VPS展開済み)
- **フロントエンド**: Next.js + TypeScript (開発予定)
- **RAG機能**: GitHub API統合 + セマンティック検索
- **展開戦略**: VPS-first deployment (ConoHa VPS)

---

## 📂 プロジェクト構造

```
prj_text_editor_rag_v1/
├── backend/              # VPS RAG システム (FastAPI + ChromaDB)
│   ├── api/              # FastAPI アプリケーション
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── data/             # ChromaDB データ
├── frontend/             # Next.js フロントエンド (開発予定)
├── shared/               # 共通型定義・ユーティリティ
│   ├── types/            # TypeScript型定義
│   └── utils/            # 共通定数・ユーティリティ
├── docs/                 # プロジェクトドキュメント
├── deployment/           # VPS展開スクリプト・設定
│   ├── scripts/          # デプロイメントスクリプト
│   └── nginx/            # Nginx設定
├── reference_v1/         # Next.js参考実装 (元prj_text_editor_v1)
└── README.md
```

---

## ✅ 完了済みタスク

### 1. プロジェクト構造作成 ✓
- `prj_text_editor_rag_v1` モノレポ作成完了
- バックエンド: `prj_vps_rag` からコピー
- フロントエンド: 空のNext.jsプロジェクト準備
- 共通型定義: TypeScript interfaces作成

### 2. 参考実装保存 ✓
- `prj_text_editor_v1` → `reference_v1/` として保存
- 将来のフロントエンド開発時の参考用
- コンポーネント: MarkdownEditor, FileExplorer等

### 3. GitHubリポジトリセットアップガイド ✓
- `REPOSITORY_SETUP_GUIDE.md` 作成
- 詳細な手順とコマンド例
- トラブルシューティング含む

---

## 🔄 現在のタスク状況

### 📋 TODOリスト

- [x] prj_text_editor_rag_v1新プロジェクト構造作成
- [x] prj_text_editor_v1をreference_v1としてバックアップ保存
- [x] GitHubリポジトリ作成手順ガイド作成
- [ ] **ConoHa VPSアカウント作成・契約** ← 次のタスク
- [ ] VPS初期セットアップとセキュリティ設定
- [ ] 本番RAG APIデプロイと動作確認

---

## 🚀 次に実行すべきコマンド

### 1. プロジェクトコピー & Git初期化
```bash
# 新しいVSCodeで実行
cd /Users/estyle-0170/Environment/test/2025/09/

# プロジェクトを独立した場所にコピー
cp -r test_text_editor/prj_text_editor_rag_v1 ./prj_text_editor_rag_v1_repo
cd prj_text_editor_rag_v1_repo

# Git初期化
git init
git add .
git commit -m "Initial commit: VPS RAG-powered Markdown Editor

🎯 Features:
- FastAPI + ChromaDB backend with Docker deployment
- GitHub API integration with semantic search
- Complete deployment automation for VPS
- Shared TypeScript types for frontend integration
- Reference Next.js frontend preserved for future development"
```

### 2. GitHub リポジトリ作成
```bash
# GitHub CLI使用（推奨）
gh repo create prj_text_editor_rag_v1 --private --description "RAG-Powered Markdown Editor with VPS Backend and Next.js Frontend"

git branch -M main
git remote add origin https://github.com/$(gh api user --jq .login)/prj_text_editor_rag_v1.git
git push -u origin main
```

---

## 🔧 重要な設定情報

### 環境変数
```bash
# backend/.env.prod (本番用)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx  # Personal Access Token
RAG_API_KEY=your_secure_api_key
CHROMADB_PERSIST_DIR=/app/data
LOG_LEVEL=INFO
```

### VPS要件
- **プロバイダ**: ConoHa VPS
- **推奨プラン**: 1GB RAM以上
- **OS**: Ubuntu 22.04 LTS
- **必要ポート**: 80, 443, 22
- **Docker & Docker Compose**: 必須

---

## 📝 重要なファイル

### 1. デプロイスクリプト
- `deployment/scripts/deploy_vps.sh` - 自動展開スクリプト
- `deployment/nginx/nginx.conf` - Nginx設定
- `backend/docker-compose.prod.yml` - 本番Docker設定

### 2. API仕様
- `shared/types/rag.ts` - TypeScript型定義
- `backend/api/main.py` - FastAPI エンドポイント
- `docs/API_REFERENCE.md` - API仕様書

### 3. 参考実装
- `reference_v1/components/MarkdownEditor.tsx` - エディタコンポーネント
- `reference_v1/components/FileExplorer.tsx` - ファイル探索機能
- `reference_v1/hooks/useAutoSync.ts` - 自動同期フック

---

## 🐛 既知の問題・注意点

### 1. ChromaDB データ
- 初回起動時にインデックス再構築が必要
- 大量ファイル処理時はメモリ使用量に注意

### 2. GitHub API制限
- Rate limit: 5000 requests/hour (認証済み)
- Large repository処理時は分割実行推奨

### 3. VPS展開時
- SSL証明書は Let's Encrypt使用
- 初回展開時はDNS設定の反映待ちが必要

---

## 🔗 参考リンク・コマンド

### よく使うコマンド
```bash
# バックエンド起動（開発）
cd backend && docker-compose up -d

# API動作確認
curl http://localhost:8000/health

# VPS展開
./deployment/scripts/deploy_vps.sh

# ログ確認
docker-compose logs -f api

# ChromaDBデータ確認
docker-compose exec api python -c "from api.rag_system import get_collection_info; print(get_collection_info())"
```

### Claude Code機能活用
- `TodoWrite`: タスク管理継続
- `Grep/Glob`: コードベース検索
- `Read`: ファイル内容確認
- `Edit/MultiEdit`: コード編集
- `Bash`: コマンド実行

---

## 💡 開発戦略

### Phase 1: VPS展開 (優先)
1. ConoHa VPS契約・セットアップ
2. 本番環境展開・動作確認
3. API性能テスト

### Phase 2: フロントエンド開発
1. `reference_v1` を参考にNext.js再構築
2. RAG API統合
3. 認証・セキュリティ実装

### Phase 3: 機能拡張
1. リアルタイム協作機能
2. 高度な検索・フィルタリング
3. モバイル対応

---

## 🎯 成功の定義

- [ ] VPS上でRAG APIが正常動作
- [ ] GitHub リポジトリ統合が機能
- [ ] フロントエンドからAPI呼び出し成功
- [ ] SSL化・セキュリティ設定完了
- [ ] 実用的な検索性能達成

---

**この文書を新しいVSCodeセッションで参照して、プロジェクト開発を継続してください。**