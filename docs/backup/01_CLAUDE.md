# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Markdown-based note-taking application with AI-powered editing capabilities, similar to Typora with Cursor-like AI assistance features. The project uses a hybrid architecture: local editing with VSCode/MCP and cloud-based web application with real-time synchronization.

## Technology Stack

- **Framework**: Next.js (App Router) with React and TypeScript
- **Editor**: CodeMirror 6 with custom extensions for:
  - Markdown syntax support (@codemirror/lang-markdown)
  - Diff visualization (@codemirror/merge)
  - AI suggestions with Decoration API
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Vector Search**: pgvector for semantic search and AI embeddings
- **File Storage**: Cloudflare R2 for images and attachments
- **Local Development**: VSCode with MCP for optimal editing experience

## Architecture

### Data Flow

1. **Local Edit Flow**: VSCode + MCP → Local files → Manual sync to Supabase
2. **Web Edit Flow**: CodeMirror Editor → Supabase (real-time) → Vector embeddings
3. **Search/Chat Flow**: Query → Supabase + pgvector → Context → LLM → Response with citations
4. **AI Edit Flow**: Content → LLM suggestions → Diff display → Accept/Reject → Apply changes
5. **Image Flow**: Upload → Cloudflare R2 → CDN URLs → Markdown references

### Architecture Components

#### Local Environment

```
local-workspace/
  notes/                  # Local markdown files (editing)
    YYYY/MM/DD/          # Date-based organization
      *.md               # Markdown files
  .vscode/               # VSCode + MCP configuration
```

#### Cloud Infrastructure

```
Supabase:
  - notes table          # Markdown content + metadata
  - note_versions table  # Version history
  - pgvector extension   # Semantic search

Cloudflare R2:
  - images/              # Image files
  - attachments/         # Other file attachments
```

## Development Commands

```bash
# Development server
cd prj_text_editor_v1
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Install dependencies (if needed)
npm install
```

## Implementation Status

### ✅ Completed Features

1. **Next.js Application**: Full setup with TypeScript, Tailwind CSS, and Turbopack
2. **CodeMirror 6 Editor**: Markdown syntax highlighting, line numbers, full editing features
3. **Live Preview**: Real-time markdown rendering with styled components
4. **AI Integration**: Multiple provider support (Anthropic, OpenAI, Google AI) with mock fallback
5. **Diff Visualization**: Visual display of AI suggestions with accept/reject functionality

### 📋 Core Architecture

- **Main Layout**: Split-screen editor/preview with toggleable panels
- **AI Suggestion Flow**: Content → API → Diff Display → User Decision → Apply Changes
- **Component Structure**: Modular React components with TypeScript interfaces

## AI Integration Details

### Current Implementation

- **API Endpoint**: `/api/ai/suggest` handles content improvement requests
- **Multi-Provider Support**: Anthropic Claude (primary), OpenAI, Google AI with fallback to mock
- **Diff Engine**: Simple line-by-line comparison with visual highlighting
- **UI Flow**: Modal overlay with diff view and accept/reject controls

### Key Components

- `AIAssistant`: Modal component for displaying suggestions and diffs
- `MarkdownEditor`: CodeMirror wrapper with full editing capabilities
- `MarkdownPreview`: Styled react-markdown renderer with GFM support

### AI Provider Configuration

The system uses environment variables to switch between providers:

- `AI_PROVIDER`: Selects active provider (anthropic, openai, google, mock)
- Provider-specific API keys for authentication

## Environment Variables

Create `.env.local` file with:

```env
# AI Provider Selection (anthropic, openai, google, mock)
AI_PROVIDER=anthropic

# API Keys (use only the one matching AI_PROVIDER)
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cloudflare R2 Configuration
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=notes-images
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

See `.env.local.example` for template.

## Project Structure

```
prj_text_editor_v1/
├── app/
│   ├── api/ai/suggest/route.ts    # AI suggestion API endpoint
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Main application page
├── components/
│   ├── AIAssistant.tsx           # AI suggestion modal with diff view
│   ├── MarkdownEditor.tsx        # CodeMirror-based markdown editor
│   └── MarkdownPreview.tsx       # Styled markdown preview renderer
├── .env.local.example            # Environment variables template
└── package.json                  # Dependencies and scripts
```

## Supabase Integration

### Database Schema

```sql
-- Notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  path TEXT UNIQUE, -- File path for organization
  tags TEXT[], -- Array of tags
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  embedding VECTOR(1536) -- For AI/semantic search
);

-- Version history
CREATE TABLE note_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Full text search index
CREATE INDEX notes_content_fts ON notes
USING gin(to_tsvector('english', content));

-- Vector similarity search index
CREATE INDEX notes_embedding_idx ON notes
USING ivfflat (embedding vector_cosine_ops);
```

### API Endpoints

```typescript
// /api/notes - CRUD operations
GET    /api/notes?search=query&tags=tag1,tag2
POST   /api/notes
PUT    /api/notes/[id]
DELETE /api/notes/[id]

// /api/sync - Local ↔ Cloud synchronization
POST   /api/sync/upload    # Upload local files to Supabase
GET    /api/sync/download  # Download notes from Supabase
POST   /api/sync/conflicts # Resolve sync conflicts

// /api/search - Advanced search with AI
POST   /api/search/semantic # Vector similarity search
GET    /api/search/fulltext # Traditional full-text search

// /api/images - R2 image management
POST   /api/images/upload   # Upload to Cloudflare R2
DELETE /api/images/[key]    # Delete from R2
```

### Real-time Features

```typescript
// Supabase Realtime subscription
const subscription = supabase
  .channel("notes")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "notes" },
    (payload) => {
      // Handle real-time updates
      updateLocalState(payload);
    }
  )
  .subscribe();
```

## Development Workflow

### Local Development (VSCode + MCP)

1. Edit markdown files locally with VSCode
2. Use MCP for file operations and AI assistance
3. Periodically sync to cloud via sync API

### Web Application

1. Real-time editing with CodeMirror
2. Automatic save to Supabase
3. Live collaboration via real-time subscriptions
4. AI-powered search and suggestions

## Key Design Decisions

1. **Hybrid Architecture**: Local editing (VSCode) + Cloud collaboration (Web)
2. **Supabase Real-time**: Instant synchronization across devices
3. **pgvector**: Semantic search capabilities for AI-powered features
4. **Cloudflare R2**: Cost-effective image storage with CDN
5. **Multi-Provider AI**: Unified interface supporting multiple AI APIs
6. **Modal UI**: Non-intrusive AI suggestions via overlay
