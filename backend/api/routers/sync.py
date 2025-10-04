from fastapi import APIRouter, Depends, BackgroundTasks
from models.requests import SyncRequest
from core.auth import verify_token
from services.github_service import GitHubService
from services.chroma_service import ChromaService
import uuid
import time

router = APIRouter(prefix="/api", tags=["sync"])
github_service = GitHubService()
chroma_service = ChromaService()

# メモリベースのジョブ管理
sync_jobs = {}  # job_id: {status, repository, files_synced, started_at, completed_at, error}

def cleanup_old_jobs():
    """1時間以上経過したジョブを削除"""
    cutoff = time.time() - 3600
    global sync_jobs
    sync_jobs = {k: v for k, v in sync_jobs.items()
                 if v.get("started_at", 0) > cutoff}

def do_sync(job_id: str, repository: str):
    """バックグラウンドで実行される同期処理"""
    try:
        files = github_service.get_markdown_files(repository)

        if not files:
            sync_jobs[job_id] = {
                "status": "error",
                "repository": repository,
                "files_synced": 0,
                "started_at": sync_jobs[job_id]["started_at"],
                "completed_at": time.time(),
                "error": "No markdown files found or repository not accessible"
            }
            return

        chroma_service.add_documents(repository, files)

        sync_jobs[job_id] = {
            "status": "completed",
            "repository": repository,
            "files_synced": len(files),
            "started_at": sync_jobs[job_id]["started_at"],
            "completed_at": time.time(),
            "message": f"Successfully synced {len(files)} files"
        }

    except Exception as e:
        sync_jobs[job_id] = {
            "status": "error",
            "repository": repository,
            "files_synced": 0,
            "started_at": sync_jobs[job_id]["started_at"],
            "completed_at": time.time(),
            "error": str(e)
        }

@router.post("/sync")
async def sync_repository(
    request: SyncRequest,
    background_tasks: BackgroundTasks,
    token: str = Depends(verify_token)
):
    """
    GitHubリポジトリをChromaDBに同期（非同期）
    ジョブIDを即座に返し、バックグラウンドで処理
    """
    # 古いジョブのクリーンアップ
    cleanup_old_jobs()

    # ジョブIDを生成
    job_id = str(uuid.uuid4())

    # ジョブを登録
    sync_jobs[job_id] = {
        "status": "processing",
        "repository": request.repository,
        "started_at": time.time()
    }

    # バックグラウンドタスクとして実行
    background_tasks.add_task(do_sync, job_id, request.repository)

    return {
        "job_id": job_id,
        "status": "processing",
        "repository": request.repository,
        "message": "Sync started in background"
    }

@router.get("/sync/status/{job_id}")
async def get_sync_status(
    job_id: str,
    token: str = Depends(verify_token)
):
    """
    同期ジョブのステータスを取得
    """
    if job_id not in sync_jobs:
        return {
            "status": "not_found",
            "message": "Job ID not found or expired"
        }

    return sync_jobs[job_id]