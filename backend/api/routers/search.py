from fastapi import APIRouter, Depends
from models.requests import SearchRequest, SearchResponse, DirectorySearchRequest
from core.auth import verify_token
from services.chroma_service import ChromaService

router = APIRouter(prefix="/api", tags=["search"])
chroma_service = ChromaService()

@router.post("/search", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    token: str = Depends(verify_token)
):
    """
    リポジトリ内のドキュメントをセマンティック検索
    """
    results = chroma_service.search(
        repo_name=request.repository,
        query=request.query,
        n_results=request.limit
    )

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

@router.post("/search/directory")
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
        results = chroma_service.search(
            repo_name=request.repository,
            query=request.query,
            n_results=request.limit
        )

    return SearchResponse(
        results=results,
        total=len(results)
    )