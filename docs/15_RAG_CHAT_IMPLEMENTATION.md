# RAG チャット機能実装ガイド

## 概要

OpenAI API を使用した RAG（Retrieval-Augmented Generation）チャット機能の実装完了。
ユーザーの質問に対して、リポジトリのドキュメントを検索し、関連情報を基に AI が回答を生成します。

## 実装内容

### 1. 新規ファイル

- `backend/api/services/openai_service.py` - OpenAI API クライアント
- `backend/api/routers/chat.py` - RAG チャットエンドポイント（更新）

### 2. 更新ファイル

- `backend/api/requirements.txt` - openai>=1.30.0 に更新
- `backend/.env.example` - OPENAI_API_KEY 追加
- `backend/.env.prod.example` - 本番環境用テンプレート

## セットアップ手順

### 1. OpenAI API キーの取得

1. https://platform.openai.com/api-keys にアクセス
2. 「Create new secret key」をクリック
3. キーをコピー（sk-で始まる文字列）

### 2. 環境変数の設定

#### ローカル環境

```
cd backend
cp .env.example .env

# .envファイルを編集
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxx  # 実際のAPIキーを設定
```

#### VPS 環境

```
cd backend
cp .env.prod.example .env.prod

# .env.prodファイルを編集
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxx  # 実際のAPIキーを設定
```

### 3. Docker イメージの再ビルド

```
# ローカル環境
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# VPS環境
sudo docker-compose -f docker-compose.prod.yml down
sudo docker-compose -f docker-compose.prod.yml build --no-cache
sudo docker-compose -f docker-compose.prod.yml up -d
```

## テストコマンド

### 基本的なチャット質問

```
curl -X POST http://localhost:8001/api/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "message": "このプロジェクトの概要を教えてください",
    "repository": "wasborn14/test-editor",
    "context_limit": 3
  }'
```

### 技術的な質問

```
curl -X POST http://localhost:8001/api/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "message": "VPSの設定方法を教えてください",
    "repository": "wasborn14/test-editor",
    "context_limit": 5
  }'
```

### コード関連の質問

```
curl -X POST http://localhost:8001/api/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "message": "ChromaDBへの接続方法を教えてください",
    "repository": "wasborn14/test-editor",
    "context_limit": 3
  }'
```

## レスポンス形式

### 成功時のレスポンス

```json
{
  "answer": "プロジェクトは、VPS上で動作するRAG（Retrieval-Augmented Generation）システムです。GitHubリポジトリのMarkdownドキュメントをChromaDBでベクトル化し、セマンティック検索を提供します。主な機能として、リポジトリ同期、ドキュメント検索、AIチャット機能があります。",
  "sources": [
    {
      "path": "README.md",
      "relevance": 0.892,
      "chunk_index": 0,
      "preview": "# VPS RAG-Powered Markdown Editor\n\nA powerful markdown editor with RAG..."
    },
    {
      "path": "docs/00_HISTORY.md",
      "relevance": 0.754,
      "chunk_index": 2,
      "preview": "## プロジェクト概要\n\nこのプロジェクトは..."
    }
  ],
  "context_used": 2,
  "repository": "wasborn14/test-editor"
}
```

### エラー時のレスポンス

#### OpenAI API キー未設定

```json
{
  "detail": "OpenAI API key is not configured. Chat feature is disabled."
}
```

#### リポジトリ未同期

```json
{
  "answer": "関連するドキュメントが見つかりませんでした。リポジトリが同期されているか確認してください。",
  "sources": [],
  "context_used": 0
}
```

## VPS でのテスト

```
# VPSでのチャットテスト
curl -X POST http://160.251.211.37/api/chat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer 4f5793c108119abe' \
  -d '{
    "message": "rag-apiのポート番号を教えて",
    "repository": "wasborn14/test-editor",
    "context_limit": 5
  }'
```

## 動作の仕組み

### RAG パイプライン

1. **質問受付**: ユーザーからの質問を受け取る
2. **セマンティック検索**: ChromaDB で関連ドキュメントを検索
3. **コンテキスト構築**: 検索結果上位 N 件をコンテキストとして結合
4. **AI 生成**: OpenAI GPT-4o-mini がコンテキストを基に回答生成
5. **レスポンス**: 回答とソース情報を返却

### 使用モデル

- **OpenAI Model**: `gpt-4o-mini` （コスト効率重視）
- **Temperature**: 0.3 （一貫性のある回答）
- **Max Tokens**: 500 （適度な長さの回答）

## トラブルシューティング

### OpenAI API エラー

```
# APIキーの確認
docker-compose exec rag-api env | grep OPENAI_API_KEY

# ログ確認
docker-compose logs rag-api | grep "OpenAI"
```

### レート制限エラー

OpenAI API のレート制限に達した場合：

- 少し時間をおいて再試行
- API キーのクォータを確認: https://platform.openai.com/usage

### コンテキスト不足

回答が不十分な場合：

- `context_limit`を 5-10 に増やす
- リポジトリを再同期して最新データを取得

## コスト見積もり

### OpenAI API 料金（2024 年 9 月時点）

- **gpt-4o-mini**:
  - Input: $0.15 / 1M tokens
  - Output: $0.60 / 1M tokens

### 1 リクエストあたりのコスト

- 平均入力: 1,500 tokens (コンテキスト + プロンプト)
- 平均出力: 300 tokens (回答)
- **概算コスト**: $0.0004 / リクエスト

### 月間コスト見積もり

- 1 日 100 リクエスト: $1.2 / 月
- 1 日 1000 リクエスト: $12 / 月

## 今後の改善案

1. **キャッシュ実装**: 同じ質問への回答をキャッシュ
2. **ストリーミング応答**: リアルタイム回答生成
3. **会話履歴**: 文脈を保持した連続会話
4. **マルチモーダル**: 画像やコードの理解
5. **ファインチューニング**: プロジェクト特化モデル

## まとめ

RAG チャット機能により、リポジトリのドキュメントに基づいた正確な回答が可能になりました。
OpenAI API キーを設定し、リポジトリを同期すれば、すぐに利用開始できます。
