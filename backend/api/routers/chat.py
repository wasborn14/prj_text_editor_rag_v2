from fastapi import APIRouter, Depends, HTTPException
from models.requests import ChatRequest
from core.auth import verify_token
from services.chroma_service import ChromaService
from services.openai_service import OpenAIService
import os

router = APIRouter(prefix="/api", tags=["chat"])

# サービスのインスタンス化
chroma_service = ChromaService()
openai_service = None

def get_openai_service():
    """OpenAIサービスの遅延初期化"""
    global openai_service
    if openai_service is None:
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(
                status_code=503,
                detail="OpenAI API key is not configured. Chat feature is disabled."
            )
        openai_service = OpenAIService()
    return openai_service

@router.post("/chat")
async def chat(
    request: ChatRequest,
    token: str = Depends(verify_token)
):
    """
    RAGベースのAIチャット

    1. ユーザーの質問に関連するドキュメントをChromaDBから検索
    2. 検索結果をコンテキストとしてOpenAI APIに送信
    3. AIが生成した回答とソース情報を返却
    """
    try:
        # OpenAIサービスを取得
        ai_service = get_openai_service()

        # 1. セマンティック検索で関連ドキュメント取得（より多く取得）
        search_results = chroma_service.search(
            repo_name=request.repository,
            query=request.message,
            n_results=request.context_limit or 10  # デフォルトを10に増加
        )

        if not search_results:
            return {
                "answer": "関連するドキュメントが見つかりませんでした。リポジトリが同期されているか確認してください。",
                "sources": [],
                "context_used": 0
            }

        # 2. コンテキスト構築（チャンクを結合）
        context_chunks = []
        for i, result in enumerate(search_results[:request.context_limit], 1):
            metadata = result.get('metadata', {})
            content = result.get('content', '')
            path = metadata.get('path', 'Unknown')

            context_chunks.append(
                f"--- ドキュメント {i}: {path} ---\n{content}"
            )

        context = "\n\n".join(context_chunks)

        # コンテキストサイズ制限（約3000文字）
        if len(context) > 3000:
            context = context[:3000] + "\n...[以下省略]"

        # 3. OpenAI APIで回答生成
        answer = ai_service.generate_response(
            query=request.message,
            context=context,
            max_tokens=500
        )

        # 4. ソース情報を整形
        sources = []
        for result in search_results[:request.context_limit]:
            metadata = result.get('metadata', {})
            sources.append({
                "path": metadata.get('path', 'Unknown'),
                "relevance": round(result.get('score', 0), 3),
                "chunk_index": metadata.get('chunk_index', 0),
                "preview": result.get('content', '')[:100] + "..."
            })

        # デバッグ用: 全検索結果を含める
        all_search_results = chroma_service.search(
            repo_name=request.repository,
            query=request.message,
            n_results=20  # より多くの結果を取得
        )

        debug_results = [
            {
                "path": result.get('metadata', {}).get('path', 'Unknown'),
                "score": round(result.get('score', 0), 3),
                "preview": result.get('content', '')[:100] + "..."
            }
            for result in all_search_results
        ]

        return {
            "answer": answer,
            "sources": sources,
            "context_used": len(search_results),
            "repository": request.repository,
            "debug": {
                "total_search_results": len(all_search_results),
                "all_results": debug_results,
                "context_limit": request.context_limit or 10
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"チャット処理中にエラーが発生しました: {str(e)}"
        )