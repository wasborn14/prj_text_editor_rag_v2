from fastapi import APIRouter, Depends
from models.requests import ChatRequest
from core.auth import verify_token

router = APIRouter(prefix="/api", tags=["chat"])

@router.post("/chat")
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