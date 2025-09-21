from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv

# サービスインポート
from services.github_service import GitHubService
from services.chroma_service import ChromaService

# 環境変数読み込み
load_dotenv()

# FastAPIアプリ初期化
app = FastAPI(
    title="VPS RAG API",
    description="GitHub Repository RAG System",
    version="1.0.0"
)

# サービス初期化
github_service = GitHubService()
chroma_service = ChromaService()

# CORS設定（開発時は全許可、本番では制限）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# セキュリティ設定
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """APIトークン検証"""
    if credentials.credentials != os.getenv("API_SECRET_KEY"):
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return credentials.credentials

# リクエスト/レスポンスモデル
class SearchRequest(BaseModel):
    query: str
    repository: str
    limit: Optional[int] = 5

class SearchResponse(BaseModel):
    results: List[dict]
    total: int

class SyncRequest(BaseModel):
    repository: str
    force: Optional[bool] = False

class ChatRequest(BaseModel):
    message: str
    repository: str
    context_limit: Optional[int] = 3

class DirectorySearchRequest(BaseModel):
    query: str
    repository: str
    directory: str = ""  # 空文字列は全体検索
    limit: Optional[int] = 5

# ルートエンドポイント
@app.get("/")
async def root():
    return {
        "name": "VPS RAG API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

# ヘルスチェック
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# 検索エンドポイント
@app.post("/api/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    token: str = Depends(verify_token)
):
    """
    リポジトリ内のドキュメントをセマンティック検索
    """
    # ChromaDBで実際に検索
    results = chroma_service.search(
        repo_name=request.repository,
        query=request.query,
        n_results=request.limit
    )

    # 結果がない場合はモックを返す
    if not results:
        results = [
            {
                "content": f"No results found for: {request.query}",
                "metadata": {
                    "path": "N/A",
                    "name": "N/A"
                },
                "score": 0
            }
        ]

    return SearchResponse(
        results=results,
        total=len(results)
    )

# 同期エンドポイント
@app.post("/api/sync")
async def sync_repository(
    request: SyncRequest,
    token: str = Depends(verify_token)
):
    """
    GitHubリポジトリをChromaDBに同期
    """
    try:
        # GitHubからMarkdownファイルを取得
        files = github_service.get_markdown_files(request.repository)

        if not files:
            return {
                "status": "error",
                "message": "No markdown files found or repository not accessible"
            }

        # ChromaDBに追加
        chroma_service.add_documents(request.repository, files)

        return {
            "status": "success",
            "repository": request.repository,
            "files_synced": len(files),
            "message": f"Successfully synced {len(files)} files"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

# ディレクトリ検索エンドポイント
@app.post("/api/search/directory")
async def search_directory(
    request: DirectorySearchRequest,
    token: str = Depends(verify_token)
):
    """
    特定ディレクトリ内でのセマンティック検索
    """
    if request.directory:
        results = chroma_service.search_by_directory(
            repo_name=request.repository,
            directory=request.directory,
            query=request.query,
            n_results=request.limit
        )
    else:
        # 通常の全体検索
        results = chroma_service.search(
            repo_name=request.repository,
            query=request.query,
            n_results=request.limit
        )

    return SearchResponse(
        results=results,
        total=len(results)
    )

# リポジトリ構造取得エンドポイント
@app.get("/api/repository/structure")
async def get_repository_structure(
    repo_name: str,
    token: str = Depends(verify_token)
):
    """
    リポジトリの階層構造を取得
    """
    try:
        files = github_service.get_all_markdown_files(repo_name)

        # ディレクトリ構造を整理
        structure = {}
        for file in files:
            parts = file['path'].split('/')
            current = structure

            for part in parts[:-1]:  # ファイル名以外
                if part not in current:
                    current[part] = {}
                current = current[part]

            # ファイル情報を追加
            current[parts[-1]] = {
                'type': 'file',
                'path': file['path'],
                'name': file['name'],
                'size': file.get('size', 0),
                'depth': file.get('depth', 0)
            }

        return {
            "repository": repo_name,
            "structure": structure,
            "total_files": len(files)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# チャットエンドポイント
@app.post("/api/chat")
async def chat(
    request: ChatRequest,
    token: str = Depends(verify_token)
):
    """
    RAGベースのAIチャット
    """
    # TODO: RAGチャット実装
    return {
        "answer": f"This is a mock answer for: {request.message}",
        "sources": [
            {"path": "README.md", "relevance": 0.9}
        ]
    }

# 開発用エンドポイント（本番では削除）
if os.getenv("ENV") == "development":
    @app.post("/api/test")
    async def test_endpoint():
        """テスト用エンドポイント"""
        return {"message": "Test successful"}