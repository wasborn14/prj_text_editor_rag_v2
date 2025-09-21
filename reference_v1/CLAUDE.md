# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VSCode-like Markdown editor with GitHub integration, AI-powered editing, and RAG (Retrieval-Augmented Generation) capabilities. This is a web-based alternative to VSCode that allows direct editing of GitHub repositories with intelligent search and AI assistance.

## Technology Stack

- **Framework**: Next.js 15 (App Router) with React 19 and TypeScript
- **Database**: Supabase PostgreSQL with pgvector extension (multi-tenant)
- **Authentication**: Supabase Auth with GitHub OAuth
- **Editor**: CodeMirror 6 with Markdown support and diff visualization
- **File Management**: Path-based hierarchical system with VSCode-like explorer
- **GitHub Integration**: GitHub API v4 (GraphQL) + REST API for repository sync
- **AI Integration**: Multi-provider support (Anthropic, OpenAI, Google AI)
- **Embeddings**: OpenAI text-embedding-3-small for semantic search
- **Styling**: Tailwind CSS 4

## Architecture

### Core Data Flows
1. **GitHub Authentication**: GitHub OAuth → Supabase Auth → User Profile Creation → Repository Selection
2. **File Management**: FileExplorer → Select File → Load from Supabase → Editor → Auto-save → Supabase → GitHub API
3. **RAG Pipeline**: File Save → Generate Embedding (OpenAI) → Store in pgvector → Semantic Search
4. **AI Assistance**: Content → AI Provider → Diff Display → Apply/Reject → Auto-commit to GitHub
5. **Sync Flow**: GitHub Webhook → Change Detection → Supabase Update → Re-embed → UI Refresh

### Multi-Tenant Database Schema
```sql
-- User profiles (linked to auth.users)
profiles (
  id UUID REFERENCES auth.users(id),
  github_username TEXT,
  github_id BIGINT,
  display_name TEXT,
  avatar_url TEXT
)

-- Repository management per user
repositories (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  github_repo_id BIGINT,
  owner TEXT,
  name TEXT,
  full_name TEXT, -- "owner/repo"
  default_branch TEXT,
  is_active BOOLEAN, -- currently selected repo
  access_token TEXT -- encrypted GitHub token
)

-- Files scoped to repositories
files (
  id UUID PRIMARY KEY,
  repository_id UUID REFERENCES repositories(id),
  path TEXT, -- relative path within repo
  name TEXT,
  type TEXT CHECK(type IN ('file', 'folder')),
  content TEXT,
  github_sha TEXT, -- Git SHA for sync tracking
  embedding VECTOR(1536),
  UNIQUE(repository_id, path)
)
```

### Key Components
- **FileExplorer** (`components/FileExplorer.tsx`): VSCode-like tree view with folder expansion
- **MarkdownEditor** (`components/MarkdownEditor.tsx`): CodeMirror 6 wrapper with diff visualization
- **AuthProvider** (`components/AuthProvider.tsx`): Supabase auth context with GitHub OAuth
- **RepositorySelector** (`components/RepositorySelector.tsx`): Modal for GitHub repository selection
- **Main Page** (`app/page.tsx`): Orchestrates 3-column layout (Explorer | Editor | Preview)
- **Auto-save Hook** (`hooks/useAutoSave.tsx`): Switches between LocalStorage (no file selected) and Supabase (file selected)

### API Endpoints
- `/api/files` - Multi-tenant CRUD operations with automatic embedding generation
- `/api/search` - Semantic search using pgvector (scoped to user's repositories)
- `/api/github/*` - GitHub API integration (auth, repositories, sync)
- `/api/ai/*` - AI provider endpoints (chat, suggest, apply-edit)

## Development Commands

```bash
# Development server (runs on http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Install dependencies
npm install
```

## Authentication Setup Notes

### GitHub OAuth Configuration
For Supabase v2 OAuth authentication, use `redirectTo: ${window.location.origin}/` instead of `/auth/callback`. The `/auth/callback` route is not needed as Supabase handles OAuth internally and redirects to the specified URL after completion.

```typescript
// ✅ Correct setup
supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: `${window.location.origin}/`, // Direct to homepage
    scopes: 'repo read:user user:email',
  }
});
```

Using `/auth/callback` causes "No authorization code received" errors because the callback route is called without a code after successful authentication.

## Environment Configuration

Required environment variables in `.env.local`:

```env
# AI Provider for text generation
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI for embeddings (required for RAG)
OPENAI_API_KEY=sk-...

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ... # Optional, for admin operations

# GitHub OAuth (required for repository access)
NEXT_PUBLIC_GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# GitHub App (future implementation)
GITHUB_APP_ID=xxx
GITHUB_PRIVATE_KEY=xxx

# Webhook security
GITHUB_WEBHOOK_SECRET=xxx
```

## Database Setup

### Supabase Database Schema
Run the complete database schema from `database_schema.sql` in Supabase SQL Editor. This includes:

- Tables: `profiles`, `repositories`, `files` with proper relationships
- pgvector extension for embeddings
- Row Level Security (RLS) policies for multi-tenant isolation
- Indexes for performance (vector search, full-text search, general queries)
- Triggers for auto-updating timestamps
- Search functions for semantic search

### Key Database Features
- **Multi-tenant**: Each user can only access their own repositories/files via RLS
- **Vector Search**: OpenAI embeddings stored in pgvector for semantic search
- **Auto-sync**: Profile creation triggered automatically on user signup

## GitHub Integration Architecture

### Authentication Flow
1. User clicks "Sign in with GitHub"
2. Supabase Auth handles GitHub OAuth
3. Profile created/updated with GitHub metadata
4. User selects repositories to connect
5. Initial sync from GitHub API to Supabase

### Sync Mechanisms
- **Web → GitHub**: File saves trigger GitHub API commits
- **GitHub → Web**: Webhooks notify of external changes
- **Conflict Resolution**: 3-way merge UI for simultaneous edits

## Key Features Implementation

### 1. VSCode-like Interface
- **3-column layout**: Explorer (collapsible) | Editor | Preview (toggleable)
- **File tree**: Hierarchical display with folder expansion/collapse
- **Tab system**: Multiple file editing (future enhancement)

### 2. AI-Powered Editing
- **Diff visualization**: Line-by-line changes with accept/reject controls
- **Context-aware suggestions**: AI has access to current file content
- **Multi-provider support**: Anthropic, OpenAI, Google AI with unified interface

### 3. Intelligent Search
- **Semantic search**: Vector similarity using pgvector
- **Repository-scoped**: Search only within user's connected repositories
- **Citation support**: Results link back to specific files and line numbers

### 4. Auto-Save with Sync
- **Debounced saving**: 300ms delay to prevent excessive API calls
- **GitHub integration**: Saves automatically commit to selected repository
- **Conflict detection**: Handles simultaneous edits gracefully

## Implementation Status

### ✅ Completed Features (Phase 3A)
- **Core Architecture**: Next.js 15 + Supabase + TypeScript foundation
- **Editor System**: CodeMirror 6 with Markdown support + live preview
- **3-Column Layout**: VSCode-like interface (Explorer | Editor | Preview)
- **AI Integration**: Multi-provider support (Anthropic, OpenAI, Google AI) with diff visualization
- **Authentication**: GitHub OAuth via Supabase Auth with token repair functionality
- **Database**: Multi-tenant schema with RLS policies for data isolation
- **Repository Management**: Complete GitHub repository selection, creation, and sync
- **File Sync**: GitHub → Supabase file synchronization with SHA tracking
- **Auto-save**: Debounced saving (300ms) to Supabase with automatic GitHub commits
- **FileExplorer**: VSCode-like hierarchical file tree with folder expansion

### ⭐ Next Priorities (Phase 3B)
1. **Bidirectional Sync**: GitHub webhooks for external change detection
2. **Conflict Resolution**: 3-way merge UI for simultaneous edits
3. **Branch Management**: Support for branch switching and creation

### 🚀 Future Phases
- **Phase 4**: RAG implementation with pgvector semantic search
- **Phase 5**: Multi-file editing with tabs and split views
- **Phase 6**: Performance optimization for large repositories

## Debugging

The application includes comprehensive error handling:
- AI API failures fall back to mock responses
- Supabase connection issues show user-friendly errors
- GitHub API rate limiting is handled gracefully
- Console logging for sync operations and embedding generation
- Row Level Security automatically isolates user data