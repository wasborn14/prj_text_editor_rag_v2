from fastapi import APIRouter, Depends
from core.auth import verify_token
from services.github_service import GitHubService

router = APIRouter(prefix="/api/debug", tags=["debug"])
github_service = GitHubService()

@router.get("/files/{repo_owner}/{repo_name}")
async def list_github_files(
    repo_owner: str,
    repo_name: str,
    token: str = Depends(verify_token)
):
    """
    GitHubから実際に取得されるファイル一覧を確認
    """
    repo_full_name = f"{repo_owner}/{repo_name}"
    files = github_service.get_markdown_files(repo_full_name, limit=200)

    # architectureを含むファイルを探す
    architecture_files = [
        f for f in files
        if 'architecture' in f['path'].lower() or 'design' in f['path'].lower()
    ]

    return {
        "total_files": len(files),
        "architecture_files": architecture_files,
        "all_file_paths": [f['path'] for f in files],
        "file_sizes": {f['path']: f['size'] for f in files}
    }