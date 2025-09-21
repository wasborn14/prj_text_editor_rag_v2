# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VPS RAG-powered Markdown Editor combining FastAPI backend with ChromaDB for semantic search and a Next.js frontend for GitHub repository editing.

**Current VPS**: 160.251.211.37 (ConoHa VPS, Ubuntu 24.04, 2Core/1GB/100GB)

## Common Development Commands

### Backend Development

```bash
# Local development with Docker
cd backend
docker-compose up -d
docker-compose logs -f api

# Production deployment on VPS
cd backend
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.prod.yml logs -f api

# API testing
curl http://localhost:8001/health
curl -X POST http://localhost:8001/api/search \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"query": "search term", "repository": "owner/repo"}'

# Repository sync
curl -X POST http://localhost:8001/api/sync \
  -H "Authorization: Bearer test123" \
  -H "Content-Type: application/json" \
  -d '{"repository": "wasborn14/test-editor"}'
```

### VPS Deployment

```bash
# SSH to VPS
ssh root@160.251.211.37

# Deploy from local machine
chmod +x deployment/scripts/deploy_vps.sh
./deployment/scripts/deploy_vps.sh

# On VPS - Check status
cd /opt/prj_text_editor_rag_v1/backend
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f api
```

### Frontend Development (Reference Implementation)

```bash
cd reference_v1
npm install
npm run dev  # http://localhost:3000
npm run build
npm start
```

## Architecture & Key Components

### Backend Architecture (FastAPI + ChromaDB)

- **API Entry Point**: `backend/api/main.py` - FastAPI application with endpoints for search, sync, and repository operations
- **RAG System**: `backend/api/rag_system.py` - ChromaDB vector database integration for semantic search
- **GitHub Integration**: PyGithub for repository synchronization and file retrieval
- **Docker Networking**: Services communicate via custom bridge network in development, localhost binding in production

### API Authentication

All endpoints except `/health` and `/` require Bearer token authentication:
```
Authorization: Bearer test123
```

### Docker Configuration

- **Development** (`docker-compose.yml`): ChromaDB on port 8000, API on port 8001
- **Production** (`docker-compose.prod.yml`): Localhost-only binding (127.0.0.1:8001), memory limits (800M), health checks, auto-restart

### Environment Variables

Backend requires:
- `GITHUB_TOKEN`: GitHub Personal Access Token (ghp_...)
- `RAG_API_KEY`: API authentication key
- `OPENAI_API_KEY`: For embeddings generation (optional, uses local model if not set)

### Data Persistence

- ChromaDB data stored in `backend/data/` directory
- Docker volumes ensure persistence across container restarts
- Initial sync required for new repositories

## Repository-Specific Conventions

### Documentation

All new documentation should be added to `docs/` with sequential numbering:
- Format: `docs/XX_DOCUMENT_NAME.md` (e.g., `11_VPS_SETUP_GUIDE.md`)
- Exception: README.md and CLAUDE.md remain in root

### GitHub Integration

- Repository: https://github.com/wasborn14/prj_text_editor_rag_v1
- Push with token: `git remote add origin https://ghp_TOKEN@github.com/wasborn14/prj_text_editor_rag_v1.git`

### Session Handover

The `claude_session_handover.md` file contains project history and completed tasks. Reference this for context on previous decisions and implementations.

## Critical Implementation Notes

### VPS Deployment Process

1. Always run deployment script from local machine (not from VPS)
2. Script handles: git pull, Docker build, container restart, health checks
3. Production uses `.env.prod` (not `.env`)
4. Nginx reverse proxy required for external access

### ChromaDB Initialization

- First repository sync may take several minutes
- Check sync status: `docker-compose logs api | grep "Sync complete"`
- Large repositories should be synced incrementally

### API Response Times

- Search: Target < 200ms
- Sync: Varies by repository size (10s-5min)
- Health check: < 10ms

### Memory Management

- Production limited to 800MB per container
- Monitor with: `docker stats`
- VPS has 1GB total RAM - avoid running multiple heavy processes