# VPS RAG 実装プラン

## 🎯 プロジェクト概要

GitHub リポジトリのMarkdownファイルに対して、高速セマンティック検索とAI会話機能を提供するVPSベースのRAGシステム。VSCodeから直接利用可能で、モバイル・他PCからもアクセス可能。

## 📋 実装スケジュール

### Phase 1: VPS基盤構築（Day 1）

#### 1.1 VPSセットアップ
```bash
# Ubuntu 22.04 LTS on Vultr/DigitalOcean ($10/月)
# スペック: 2 vCPU, 2GB RAM, 50GB SSD

# 初期設定
sudo apt update && sudo apt upgrade -y
sudo apt install docker.io docker-compose nginx certbot python3-pip -y

# ユーザー作成
sudo adduser rag-admin
sudo usermod -aG docker,sudo rag-admin

# ファイアウォール設定
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8000/tcp  # Development
sudo ufw enable
```

#### 1.2 プロジェクト構造作成
```
/home/rag-admin/vps-rag/
├── docker-compose.yml
├── api/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py
│   ├── routers/
│   │   ├── search.py
│   │   ├── chat.py
│   │   └── sync.py
│   └── services/
│       ├── github_service.py
│       ├── chroma_service.py
│       └── openai_service.py
├── nginx/
│   └── nginx.conf
├── data/
│   └── chromadb/
└── .env
```

### Phase 2: RAG API実装（Day 2）

#### 2.1 FastAPI基本設定
```python
# api/main.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="VPS RAG API", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では制限
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# セキュリティ
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != os.getenv("API_SECRET_KEY"):
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return credentials.credentials

# ルーター登録
from routers import search, chat, sync
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])

@app.get("/")
async def root():
    return {"status": "VPS RAG API is running"}
```

#### 2.2 ChromaDB サービス
```python
# api/services/chroma_service.py
import chromadb
from chromadb.utils import embedding_functions
from typing import List, Dict
import hashlib

class ChromaService:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="/data/chromadb")

        # OpenAI Embedding Function
        self.embedding_fn = embedding_functions.OpenAIEmbeddingFunction(
            api_key=os.getenv("OPENAI_API_KEY"),
            model_name="text-embedding-3-small"
        )

    def get_or_create_collection(self, repo_name: str):
        """リポジトリごとのコレクション作成"""
        collection_name = hashlib.md5(repo_name.encode()).hexdigest()[:16]

        try:
            return self.client.get_collection(
                name=collection_name,
                embedding_function=self.embedding_fn
            )
        except:
            return self.client.create_collection(
                name=collection_name,
                embedding_function=self.embedding_fn
            )

    def index_documents(self, repo_name: str, documents: List[Dict]):
        """ドキュメントをインデックス"""
        collection = self.get_or_create_collection(repo_name)

        # チャンク分割
        chunks = []
        for doc in documents:
            doc_chunks = self.split_into_chunks(doc['content'], 500)
            for i, chunk in enumerate(doc_chunks):
                chunks.append({
                    'id': f"{doc['path']}_{i}",
                    'content': chunk,
                    'metadata': {
                        'path': doc['path'],
                        'chunk_index': i,
                        'total_chunks': len(doc_chunks),
                        'sha': doc['sha']
                    }
                })

        # バッチ追加
        if chunks:
            collection.add(
                documents=[c['content'] for c in chunks],
                metadatas=[c['metadata'] for c in chunks],
                ids=[c['id'] for c in chunks]
            )

    def search(self, repo_name: str, query: str, n_results: int = 5):
        """セマンティック検索"""
        collection = self.get_or_create_collection(repo_name)

        results = collection.query(
            query_texts=[query],
            n_results=n_results
        )

        return {
            'results': [
                {
                    'content': doc,
                    'metadata': meta,
                    'score': 1 - distance  # 類似度スコアに変換
                }
                for doc, meta, distance in zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                )
            ]
        }

    def split_into_chunks(self, text: str, chunk_size: int) -> List[str]:
        """テキストをチャンクに分割"""
        words = text.split()
        chunks = []
        current_chunk = []
        current_size = 0

        for word in words:
            current_chunk.append(word)
            current_size += len(word) + 1

            if current_size >= chunk_size:
                chunks.append(' '.join(current_chunk))
                current_chunk = []
                current_size = 0

        if current_chunk:
            chunks.append(' '.join(current_chunk))

        return chunks
```

#### 2.3 GitHub 同期サービス
```python
# api/services/github_service.py
from github import Github
from typing import List, Dict
import base64

class GitHubService:
    def __init__(self, access_token: str):
        self.github = Github(access_token)

    async def sync_repository(self, repo_full_name: str) -> List[Dict]:
        """GitHubリポジトリからMarkdownファイルを取得"""
        repo = self.github.get_repo(repo_full_name)
        markdown_files = []

        # 再帰的にファイルを探索
        contents = repo.get_contents("")

        while contents:
            file_content = contents.pop(0)

            if file_content.type == "dir":
                contents.extend(repo.get_contents(file_content.path))
            elif file_content.path.endswith('.md'):
                # ファイル内容を取得
                content = base64.b64decode(file_content.content).decode('utf-8')

                markdown_files.append({
                    'path': file_content.path,
                    'content': content,
                    'sha': file_content.sha,
                    'name': file_content.name
                })

        return markdown_files

    async def get_file_content(self, repo_full_name: str, file_path: str) -> str:
        """特定ファイルの内容を取得"""
        repo = self.github.get_repo(repo_full_name)
        file_content = repo.get_contents(file_path)

        if file_content.encoding == 'base64':
            return base64.b64decode(file_content.content).decode('utf-8')
        return file_content.content
```

### Phase 3: Docker設定（Day 2）

#### 3.1 Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  chromadb:
    image: chromadb/chroma:latest
    container_name: chromadb
    ports:
      - "8000:8000"
    volumes:
      - ./data/chromadb:/chroma/data
    environment:
      - PERSIST_DIRECTORY=/chroma/data
      - ANONYMIZED_TELEMETRY=false
    restart: unless-stopped

  rag-api:
    build:
      context: ./api
      dockerfile: Dockerfile
    container_name: rag-api
    ports:
      - "8001:8000"
    volumes:
      - ./api:/app
      - ./data:/data
    environment:
      - CHROMA_HOST=chromadb
      - CHROMA_PORT=8000
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - API_SECRET_KEY=${API_SECRET_KEY}
      - GITHUB_TOKEN=${GITHUB_TOKEN}
    depends_on:
      - chromadb
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    container_name: nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - rag-api
    restart: unless-stopped
```

#### 3.2 Dockerfile
```dockerfile
# api/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 依存関係インストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコピー
COPY . .

# 起動
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### Phase 4: VSCode統合（Day 3）

#### 4.1 REST Client設定（拡張機能開発不要）
```bash
# VSCode拡張インストール
code --install-extension humao.rest-client
# または Thunder Client: rangav.vscode-thunder-client
```

#### 4.2 API呼び出しファイル作成
```http
# .vscode/rag-api.http
@baseUrl = https://your-vps-ip:8001
@token = {{$env RAG_API_TOKEN}}
@repo = username/repository

### RAG検索
POST {{baseUrl}}/api/search
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "query": "検索キーワード",
  "repository": "{{repo}}",
  "n_results": 5
}

### GitHub同期実行
POST {{baseUrl}}/api/sync
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "repository": "{{repo}}",
  "force": false
}

### チャット質問
POST {{baseUrl}}/api/chat
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "message": "このプロジェクトの構成を教えて",
  "repository": "{{repo}}",
  "context_limit": 3
}
```

#### 4.3 bashエイリアス設定（オプション）
```bash
# ~/.bashrc または ~/.zshrc に追加
export RAG_API_URL="https://your-vps-ip:8001"
export RAG_API_TOKEN="your-secret-token"
export RAG_REPO="username/repository"

# RAG検索関数
rag-search() {
  curl -s -X POST "$RAG_API_URL/api/search" \
    -H "Authorization: Bearer $RAG_API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$1\",\"repository\":\"$RAG_REPO\"}" | jq
}

# 使用例: rag-search "Azure deployment"
```

### Phase 5: セキュリティ設定（Day 3）

#### 5.1 Tailscale設定
```bash
# VPS側
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --advertise-routes=10.0.0.0/24

# ローカル側
# macOS/Windows/Linux用Tailscaleインストール
tailscale up
# これでVPSに100.x.x.xのIPでアクセス可能
```

#### 5.2 SSL証明書設定
```bash
# Let's Encrypt SSL証明書
sudo certbot certonly --standalone -d your-domain.com
sudo certbot renew --dry-run  # 自動更新テスト
```

### Phase 6: 既存Webアプリ統合（Day 4）

#### 6.1 API呼び出し変更
```typescript
// hooks/useRAGSearch.ts
export const useRAGSearch = () => {
  const searchDocuments = async (query: string) => {
    // Supabase pgvector から VPS RAG へ切り替え
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_VPS_RAG_ENDPOINT}/api/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_VPS_RAG_KEY}`
        },
        body: JSON.stringify({
          query,
          repository: selectedRepository.full_name
        })
      }
    );

    return response.json();
  };

  return { searchDocuments };
};
```

## 📊 成果物

### 完成時の機能
1. **VPS RAGサーバー**: ChromaDB + FastAPI
2. **GitHub同期**: 自動インデックス更新
3. **VSCode統合**: 検索・チャットコマンド
4. **セキュア接続**: Tailscale VPN
5. **Web UI連携**: 既存エディタから利用可能

### パフォーマンス目標
- 検索レスポンス: < 200ms
- インデックス更新: < 30秒/100ファイル
- 同時接続: 10ユーザー
- メモリ使用: < 1GB

## 💰 コスト試算

```yaml
月額費用:
  VPS (Vultr/DigitalOcean): $10
  OpenAI API (Embeddings): $5-10
  ドメイン: $1
  合計: $16-21/月

年間: 約$200 (¥30,000)
```

## 🚀 次のステップ

1. **Phase 7**: モバイルアプリ開発（Flutter/React Native）
2. **Phase 8**: Azure Container Instances移行準備
3. **Phase 9**: 複数リポジトリ管理UI
4. **Phase 10**: チーム共有機能

## 📝 実装開始チェックリスト

- [ ] VPSプロバイダー選択（Vultr/DigitalOcean/Linode）
- [ ] ドメイン取得（オプション）
- [ ] OpenAI APIキー取得
- [ ] GitHub Personal Access Token作成
- [ ] Tailscaleアカウント作成
- [ ] 開発環境準備（Docker, Python, Node.js）

---

**作成日**: 2025/01/17
**想定工期**: 4日
**難易度**: 中級