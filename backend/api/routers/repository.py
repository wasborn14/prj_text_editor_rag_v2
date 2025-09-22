from fastapi import APIRouter, Depends, HTTPException
from core.auth import verify_token
from services.github_service import GitHubService

router = APIRouter(prefix="/api", tags=["repository"])
github_service = GitHubService()

@router.get("/repository/structure")
async def get_repository_structure(
    repo_name: str,
    token: str = Depends(verify_token)
):
    """
    リポジトリの階層構造を取得
    """
    try:
        files = github_service.get_all_markdown_files(repo_name)

        structure = {}
        for file in files:
            parts = file['path'].split('/')
            current = structure

            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]

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