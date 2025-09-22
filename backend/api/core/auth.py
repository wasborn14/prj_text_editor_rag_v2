from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != os.getenv("RAG_API_KEY"):
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return credentials.credentials