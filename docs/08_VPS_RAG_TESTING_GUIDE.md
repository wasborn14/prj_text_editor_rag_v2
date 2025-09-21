# VPS RAG Testing Guide

VPS RAGシステムの探索機能と実行方法の完全ガイド

## 📋 目次

1. [システム概要](#システム概要)
2. [探索の仕組み](#探索の仕組み)
3. [実行方法](#実行方法)
4. [APIエンドポイント](#apiエンドポイント)
5. [テスト結果](#テスト結果)
6. [トラブルシューティング](#トラブルシューティング)

## システム概要

VPS RAGシステムは以下の技術スタックで構築されています：

- **API**: FastAPI (Python 3.11)
- **ベクトルDB**: ChromaDB
- **GitHub統合**: PyGithub
- **コンテナ**: Docker + docker-compose
- **認証**: Bearer Token

### アーキテクチャ図

```
GitHub Repository
        ↓
   GitHub API (PyGithub)
        ↓
   階層ファイル探索
        ↓
   テキストチャンク分割
        ↓
   ChromaDB (ベクトル化)
        ↓
   セマンティック検索
```

## 探索の仕組み

### 1. GitHub API統合

#### 再帰的ファイル探索
```python
def get_all_markdown_files(self, repo_name: str, path: str = "", depth: int = 0, max_depth: int = 5):
    """
    最大5階層まで再帰的に.mdファイルを探索
    """
    - ディレクトリを深度優先で探索
    - .mdファイルのみを対象
    - Base64デコードでコンテンツ取得
    - 階層情報をメタデータに保存
```

#### メタデータ構造
```json
{
    "path": "docs/api/authentication.md",
    "name": "authentication.md",
    "directory": "docs/api",
    "depth": 2,
    "size": 6890,
    "sha": "b5900e3545b28eff044560875bc823729a4ad5d4"
}
```

### 2. テキストチャンク分割

#### チャンク戦略
```python
def split_into_chunks(self, text: str, chunk_size: int = 500):
    """
    500文字単位でテキストを分割
    - 単語境界を保持
    - 文脈の連続性を維持
    - 重複なしの連続チャンク
    """
```

#### チャンクメタデータ
```json
{
    "chunk_index": 0,
    "total_chunks": 14,
    "file_type": "markdown",
    "file_size": 6890
}
```

### 3. ChromaDBベクトル化

#### コレクション管理
```python
def get_or_create_collection(self, repo_name: str):
    """
    リポジトリ名をMD5ハッシュ化してコレクション名生成
    例: repo_b5900e35
    """
```

#### ベクトル検索
- **アルゴリズム**: コサイン類似度
- **埋め込み**: ChromaDBデフォルト（sentence-transformers）
- **スコア変換**: `1 - (distance / 2)`

## 実行方法

### 1. 環境構築

#### 必要な環境変数
```bash
# .env ファイル
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
API_SECRET_KEY=test123
```

#### Docker起動
```bash
cd prj_vps_rag
docker-compose up -d
```

#### 起動確認
```bash
curl http://localhost:8001/health
# {"status": "healthy"}
```

### 2. リポジトリ同期

#### 基本同期
```bash
curl -X POST http://localhost:8001/api/sync \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"repository": "wasborn14/test-editor"}'
```

#### 強制同期
```bash
curl -X POST http://localhost:8001/api/sync \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"repository": "wasborn14/test-editor", "force": true}'
```

### 3. 検索実行

#### セマンティック検索
```bash
curl -X POST http://localhost:8001/api/search \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "useAutoSync フックの使い方",
    "repository": "wasborn14/test-editor",
    "limit": 5
  }'
```

#### ディレクトリ限定検索
```bash
curl -X POST http://localhost:8001/api/search/directory \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "API認証",
    "repository": "wasborn14/test-editor",
    "directory": "docs/api",
    "limit": 3
  }'
```

#### リポジトリ構造取得
```bash
curl -X GET "http://localhost:8001/api/repository/structure?repo_name=wasborn14/test-editor" \
  -H "Authorization: Bearer test123"
```

## APIエンドポイント

### 1. 認証なしエンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/` | GET | API情報 |
| `/health` | GET | ヘルスチェック |
| `/docs` | GET | Swagger UI |

### 2. 認証必須エンドポイント

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/sync` | POST | リポジトリ同期 |
| `/api/search` | POST | セマンティック検索 |
| `/api/search/directory` | POST | ディレクトリ検索 |
| `/api/repository/structure` | GET | 構造取得 |
| `/api/chat` | POST | RAGチャット（未実装） |

### 3. リクエスト/レスポンス例

#### 検索レスポンス
```json
{
  "results": [
    {
      "content": "リファレンス](../reference/sdk.md) - 各言語のSDK使用方法",
      "metadata": {
        "chunk_index": 13,
        "depth": 2,
        "directory": "docs/api",
        "file_size": 6890,
        "file_type": "markdown",
        "name": "authentication.md",
        "path": "docs/api/authentication.md",
        "sha": "b5900e3545b28eff044560875bc823729a4ad5d4",
        "total_chunks": 14
      },
      "score": 0.39491933584213257
    }
  ],
  "total": 5
}
```

## テスト結果

### 実行ログ（2025年9月21日）

#### ✅ 同期テスト
```
Repository: wasborn14/test-editor
Files synced: 13
Status: success
```

#### ✅ セマンティック検索
```
Query: "useAutoSync フックの使い方"
Results: 5件
Top score: 0.394
```

#### ✅ ディレクトリ検索
```
Query: "API認証"
Directory: "docs/api"
Results: 3件（docs/api内のみ）
Top score: 0.531
```

#### ✅ 構造取得
```json
{
  "repository": "wasborn14/test-editor",
  "total_files": 13,
  "structure": {
    "docs": {
      "api": {
        "authentication.md": {...},
        "endpoints.md": {...}
      }
    }
  }
}
```

### パフォーマンス

| 操作 | 実行時間 | ファイル数 |
|-----|---------|-----------|
| 同期 | ~17秒 | 13ファイル |
| 検索 | <1秒 | 全チャンク |
| 構造取得 | ~12秒 | 13ファイル |

## トラブルシューティング

### 1. よくある問題

#### ChromaDBエラー
```bash
# NumPy互換性問題
pip install numpy==1.26.4

# クライアント初期化エラー
# Legacy: chromadb.Client()
# New: chromadb.PersistentClient(path="/data/chromadb")
```

#### GitHub認証エラー
```bash
# トークン確認
echo $GITHUB_TOKEN

# 匿名アクセス制限
# レート制限: 60req/hour → 5000req/hour (認証済み)
```

#### Docker問題
```bash
# コンテナ再起動
docker-compose restart rag-api

# ログ確認
docker-compose logs -f rag-api

# ボリューム初期化
docker-compose down -v
docker-compose up -d
```

### 2. デバッグ方法

#### API動作確認
```bash
# ヘルスチェック
curl http://localhost:8001/health

# Swagger UI
open http://localhost:8001/docs

# 詳細ログ
docker-compose logs -f
```

#### 検索精度調整
```python
# チャンクサイズ調整
chunk_size = 500  # デフォルト

# 検索結果数
n_results = 5     # デフォルト

# スコア閾値
min_score = 0.3   # 実装検討
```

### 3. パフォーマンス最適化

#### メモリ最適化
```yaml
# docker-compose.yml
services:
  rag-api:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

#### 並列処理
```python
# 大量ファイル処理
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def parallel_processing():
    # 実装検討
```

## 次のステップ

### 1. 機能拡張
- [ ] RAGチャット機能実装
- [ ] 全文検索とセマンティック検索の組み合わせ
- [ ] ファイル更新検知（GitHub Webhooks）
- [ ] 多言語ファイル対応（.py, .js, .tsx等）

### 2. 本番展開
- [ ] VPSデプロイ（Ubuntu + Docker）
- [ ] Tailscale VPN設定
- [ ] SSL証明書設定
- [ ] モニタリング（Prometheus + Grafana）

### 3. Azure移行
- [ ] Container Instances展開
- [ ] Azure Kubernetes Service移行
- [ ] Azure AI Search統合
- [ ] コスト最適化

---

**作成日**: 2025年1月20日
**更新日**: 2025年1月20日
**バージョン**: 1.0.0