from fastapi import APIRouter, Depends
from core.auth import verify_token
import chromadb
import hashlib

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/collections")
async def list_collections(token: str = Depends(verify_token)):
    """
    ChromaDBに保存されている全コレクション一覧
    """
    client = chromadb.PersistentClient(path="/data/chromadb")
    collections = client.list_collections()

    result = []
    for col in collections:
        # ハッシュから元のリポジトリ名を推測
        repo_names = {
            f"repo_{hashlib.md5('wasborn14/test-editor'.encode()).hexdigest()[:8]}": "wasborn14/test-editor",
            f"repo_{hashlib.md5('wasborn14/prj_text_editor_rag_v1'.encode()).hexdigest()[:8]}": "wasborn14/prj_text_editor_rag_v1",
        }

        result.append({
            "name": col.name,
            "probable_repo": repo_names.get(col.name, "unknown"),
            "document_count": col.count()
        })

    return {"collections": result}

@router.delete("/collections/{collection_name}")
async def delete_collection(
    collection_name: str,
    token: str = Depends(verify_token)
):
    """
    特定のコレクションを削除
    """
    client = chromadb.PersistentClient(path="/data/chromadb")
    try:
        client.delete_collection(name=collection_name)
        return {"status": "success", "message": f"Collection {collection_name} deleted"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/collection/{repo_name}/peek")
async def peek_collection(
    repo_name: str,
    limit: int = 5,
    token: str = Depends(verify_token)
):
    """
    特定リポジトリのコレクション内容を確認
    """
    client = chromadb.PersistentClient(path="/data/chromadb")
    collection_name = f"repo_{hashlib.md5(repo_name.encode()).hexdigest()[:8]}"

    try:
        col = client.get_collection(name=collection_name)
        result = col.peek(limit)
        return {
            "repository": repo_name,
            "collection_name": collection_name,
            "total_documents": col.count(),
            "sample_data": {
                "ids": result.get('ids', [])[:3],
                "metadatas": result.get('metadatas', [])[:3],
                "documents": [doc[:100] + "..." if len(doc) > 100 else doc
                            for doc in result.get('documents', [])[:3]]
            }
        }
    except Exception as e:
        return {"status": "error", "message": f"Collection not found: {str(e)}"}