from pydantic import BaseModel
from typing import List, Optional

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
    directory: str = ""
    limit: Optional[int] = 5