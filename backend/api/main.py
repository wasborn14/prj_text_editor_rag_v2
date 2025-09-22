from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# ルーターインポート
from routers import search, sync, repository, chat, admin, debug

# 環境変数読み込み
load_dotenv()

# FastAPIアプリ初期化
app = FastAPI(
    title="VPS RAG API",
    description="GitHub Repository RAG System",
    version="1.0.0"
)

# CORS設定（開発時は全許可、本番では制限）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(search.router)
app.include_router(sync.router)
app.include_router(repository.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(debug.router)

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