from fastapi import APIRouter, Depends
from models.requests import SyncRequest
from core.auth import verify_token
from services.github_service import GitHubService
from services.chroma_service import ChromaService

router = APIRouter(prefix="/api", tags=["sync"])
github_service = GitHubService()
chroma_service = ChromaService()

@router.post("/sync")
async def sync_repository(
    request: SyncRequest,
    token: str = Depends(verify_token)
):
    """
    GitHubリポジトリをChromaDBに同期
    """
    try:
        files = github_service.get_markdown_files(request.repository)

        if not files:
            return {
                "status": "error",
                "message": "No markdown files found or repository not accessible"
            }

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