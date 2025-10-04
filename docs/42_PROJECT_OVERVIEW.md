# プロジェクト全体概要

## プロジェクト概要

**RAG-Powered Markdown Editor** は、GitHub リポジトリと統合された AI 支援 Markdown エディターです。VPS 上の RAG（Retrieval-Augmented Generation）バックエンドと Next.js フロントエンドを組み合わせ、セマンティック検索とインテリジェントなドキュメント編集機能を提供します。

---

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────┐
│                  User (Browser)                      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│           Frontend (Next.js + Vercel)                │
│  ┌──────────────────────────────────────────────┐   │
│  │  • Authentication (Supabase + GitHub OAuth)  │   │
│  │  • File Editor (Novel + TipTap)              │   │
│  │  • File Tree (Sidebar)                       │   │
│  │  • State Management (Zustand)                │   │
│  └──────────────────────────────────────────────┘   │
└───────┬────────────────────────────────────┬─────────┘
        │                                    │
        │ GitHub API                         │ Supabase API
        ▼                                    ▼
┌───────────────────┐            ┌────────────────────┐
│   GitHub          │            │   Supabase         │
│   • Repositories  │            │   • Auth           │
│   • File CRUD     │            │   • User Profiles  │
│   • OAuth         │            │   • Repositories   │
└───────────────────┘            └────────────────────┘
        │
        │ Repository Sync
        ▼
┌─────────────────────────────────────────────────────┐
│         Backend (FastAPI + ChromaDB + VPS)          │
│  ┌──────────────────────────────────────────────┐   │
│  │  • Semantic Search (ChromaDB)                │   │
│  │  • Repository Indexing                       │   │
│  │  • GitHub Integration (PyGithub)             │   │
│  │  • Docker + Nginx                            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 技術スタック

#### Frontend
- **Framework**: Next.js 15.5 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19
- **Editor**: Novel 1.0 (TipTap based)
- **State Management**: Zustand 5.0
- **Data Fetching**: TanStack React Query 5
- **Authentication**: Supabase Auth + GitHub OAuth
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Deployment**: Vercel

#### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Vector DB**: ChromaDB
- **GitHub Integration**: PyGithub
- **Container**: Docker + Docker Compose
- **Web Server**: Nginx
- **Deployment**: ConoHa VPS (Ubuntu 24.04, 2Core/1GB/100GB)

#### Database
- **Primary DB**: Supabase (PostgreSQL)
- **Vector DB**: ChromaDB (for RAG)

---

## 認証フロー

### 1. GitHub OAuth 認証

```
1. ユーザーがログインページで「Continue with GitHub」をクリック
   └─> frontend/src/app/page.tsx

2. Supabase が GitHub OAuth フローを開始
   └─> frontend/src/stores/authStore.ts: signInWithGitHub()

3. GitHub で認証・承認
   └─> scope: "repo read:user user:email"

4. GitHub が Supabase にリダイレクト
   └─> Supabase が provider_token (GitHub PAT) を発行

5. Supabase がアプリケーションにリダイレクト
   └─> frontend/src/middleware.ts: OAuth callback 処理

6. セッション確立 + User/Profile 作成
   └─> frontend/src/app/layout.tsx: AuthProvider で初期化
```

### 2. プロフィール管理

**Profile テーブル**:
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  github_username TEXT,
  github_id BIGINT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**フロー**:
1. 初回ログイン時、`ensureProfile()` が実行される
2. GitHub メタデータから Profile を作成/更新
3. Profile 情報を authStore に保存

### 3. リポジトリ選択

**User Repositories テーブル**:
```sql
CREATE TABLE user_repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  github_repo_id BIGINT,
  owner TEXT,
  name TEXT,
  full_name TEXT,
  description TEXT,
  default_branch TEXT DEFAULT 'main',
  language TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**フロー**:
1. ログイン後、`/repository-setup` にリダイレクト
2. GitHub API でユーザーのリポジトリ一覧を取得
3. ユーザーがリポジトリを選択
4. 選択されたリポジトリを `user_repositories` に保存 (`is_selected = true`)
5. `/workspace` にリダイレクト

---

## コア機能

### 1. ワークスペース (Workspace)

**ページ**: `frontend/src/app/workspace/page.tsx`

#### 構成要素

```
┌──────────────────────────────────────────────────┐
│  Header (User Profile + Repository Name)         │
├──────────────┬───────────────────────────────────┤
│   Sidebar    │   Editor Area                     │
│              │                                   │
│  • File Tree │  ┌──────────────────────────────┐ │
│  • Search    │  │  Tab Bar                     │ │
│  • Create    │  ├──────────────────────────────┤ │
│  • Delete    │  │                              │ │
│              │  │  Novel Editor (TipTap)       │ │
│              │  │  - Markdown editing          │ │
│              │  │  - Real-time preview         │ │
│              │  │  - Auto-save                 │ │
│              │  │                              │ │
│              │  └──────────────────────────────┘ │
└──────────────┴───────────────────────────────────┘
```

### 2. サイドバー (Sidebar)

**コンポーネント**: `frontend/src/components/organisms/Sidebar/`

#### 機能

- **ファイルツリー表示**
  - GitHub リポジトリの階層構造を表示
  - ディレクトリの展開/折りたたみ
  - ファイル/ディレクトリの選択（青いハイライト）

- **ファイル/フォルダ作成**
  - FilePlus/FolderPlus ボタン
  - インライン入力フィールド
  - 自動で `.md` 拡張子を追加
  - 選択中のディレクトリ内に作成
  - 閉じているディレクトリは自動展開

- **ファイル/フォルダ削除**
  - 右クリックメニュー
  - 削除確認ダイアログ
  - ローディング表示
  - 開いているタブの自動クローズ

- **検索**
  - ファイル名検索
  - リアルタイムフィルタリング

- **ピン機能**
  - よく使うファイルをピン留め
  - ブックマークビュー

#### 状態管理

**SidebarStore** (`frontend/src/stores/sidebarStore.ts`):
```typescript
interface SidebarState {
  isVisible: boolean
  width: number
  viewMode: 'tree' | 'list' | 'bookmarks'
  pinnedFiles: string[]
  expandedFolders: Set<string>

  // ファイル/フォルダ作成
  creatingItem: {
    type: 'file' | 'folder'
    parentPath: string
  } | null

  // コンテキストメニュー
  contextMenu: {
    x: number
    y: number
    targetPath: string
    targetType: 'file' | 'dir'
  } | null
}
```

### 3. エディター (Editor)

**コンポーネント**: `frontend/src/components/organisms/Editor/`

#### 機能

- **マルチタブ編集**
  - 複数ファイルを同時に開ける
  - タブ間の切り替え
  - タブのクローズ

- **Novel エディター**
  - WYSIWYG Markdown エディター
  - リアルタイムプレビュー
  - スラッシュコマンド
  - テーブルサポート

- **自動保存**
  - 変更検知 (isDirty フラグ)
  - 保存ボタン (Cmd/Ctrl + S)
  - GitHub への直接保存
  - SHA 管理（競合防止）

#### 状態管理

**EditorStore** (`frontend/src/stores/editorStore.ts`):
```typescript
interface EditorTab {
  id: string
  path: string
  name: string
  content: string
  isDirty: boolean
  language: string
  isLoading: boolean
  isSaving: boolean
  lastSaved?: Date
  sha?: string  // GitHub API 用
}

interface EditorState {
  openTabs: EditorTab[]
  activeTabId: string | null

  // タブ管理
  openFile(file)
  closeTab(tabId)
  setActiveTab(tabId)
  closeAllTabs()

  // ファイル操作
  updateContent(tabId, content, sha?)
  updateSha(tabId, sha)
  markSaved(tabId)
}
```

---

## API エンドポイント

### Frontend API Routes

#### 認証関連

- **GET** `/api/profile`
  - ユーザープロフィール取得
  - Supabase から Profile 情報を取得

- **PUT** `/api/profile`
  - ユーザープロフィール更新
  - GitHub メタデータから Profile を作成/更新

#### リポジトリ関連

- **GET** `/api/repositories`
  - ユーザーのリポジトリ一覧取得
  - GitHub API + Supabase から取得

- **POST** `/api/repositories/select`
  - リポジトリを選択
  - Supabase に保存 (`is_selected = true`)

- **GET** `/api/repositories/{owner}/{repo}/files`
  - リポジトリのファイル構造取得
  - GitHub API からツリー構造を取得

#### ファイル操作

- **GET** `/api/github/file-content`
  - ファイル内容取得
  - Query: `owner`, `repo`, `path`
  - Response: `{ content, sha, encoding }`

- **POST** `/api/github/save-file`
  - ファイル保存
  - Body: `{ owner, repo, path, content, sha?, message? }`
  - Response: `{ success, sha }`

- **POST** `/api/github/create-file`
  - ファイル/フォルダ作成
  - Body: `{ owner, repo, path, content?, type: 'file' | 'folder' }`
  - フォルダ作成時は `.gitkeep` を含む
  - Response: `{ success, path, sha, type }`

- **DELETE** `/api/github/delete-file`
  - ファイル/フォルダ削除
  - Body: `{ owner, repo, path, type: 'file' | 'dir' }`
  - フォルダは再帰的に削除
  - Response: `{ success, path, type, deletedFiles? }`

### Backend API (VPS RAG)

**Base URL**: `http://160.251.211.37:8001`

- **GET** `/health`
  - ヘルスチェック

- **POST** `/api/search`
  - セマンティック検索
  - Body: `{ query, repository, n_results? }`
  - ChromaDB でベクトル検索

- **POST** `/api/sync`
  - リポジトリ同期
  - Body: `{ repository }`
  - GitHub リポジトリを ChromaDB にインデックス

- **GET** `/api/repository/structure`
  - リポジトリ構造取得
  - Query: `repository`

---

## データフロー

### ファイル読み込みフロー

```
1. ユーザーがサイドバーでファイルをクリック
   └─> FileTreeItem: onSelect(node)

2. editorStore.openFile() が呼ばれる
   └─> 既存タブがあればアクティブ化
   └─> なければ新規タブ作成

3. useFileContent() フックが実行される
   └─> /api/github/file-content を呼び出し
   └─> GitHub API でファイル内容取得

4. editorStore.updateContent() でコンテンツを更新
   └─> SHA も一緒に保存（競合防止用）

5. Novel エディターにコンテンツを表示
```

### ファイル保存フロー

```
1. ユーザーが保存ボタンをクリック (Cmd/Ctrl + S)
   └─> useSaveFile() フック

2. /api/github/save-file を呼び出し
   └─> Body: { owner, repo, path, content, sha }
   └─> GitHub API PUT でファイル更新

3. 新しい SHA を取得
   └─> editorStore.updateSha() で更新

4. editorStore.markSaved()
   └─> isDirty = false
   └─> lastSaved = new Date()
```

### ファイル作成フロー

```
1. ユーザーが FilePlus/FolderPlus ボタンをクリック
   └─> SidebarHeader: handleCreateFile/Folder()

2. 選択中のディレクトリを展開（閉じている場合）
   └─> sidebarStore.expandFolder()

3. CreateFileInput コンポーネントを表示
   └─> sidebarStore.setCreatingItem({ type, parentPath })

4. ユーザーがファイル名を入力して Enter
   └─> 拡張子がなければ `.md` を自動追加
   └─> Sidebar: handleCreateConfirm()

5. /api/github/create-file を呼び出し
   └─> GitHub API PUT でファイル作成
   └─> フォルダの場合は `.gitkeep` も作成

6. ファイルリストを更新
   └─> refetchFiles()

7. ファイルをエディターで開く（ファイルの場合のみ）
   └─> editorStore.openFile()
```

### ファイル削除フロー

```
1. ユーザーがファイルを右クリック
   └─> FileTreeItem: handleContextMenu()
   └─> sidebarStore.setContextMenu()

2. ContextMenu を表示

3. ユーザーが「Delete」をクリック
   └─> Sidebar: handleDeleteClick()
   └─> ConfirmDialog を表示

4. ユーザーが「Delete」を確認
   └─> Sidebar: handleDeleteConfirm()

5. /api/github/delete-file を呼び出し
   └─> GitHub API DELETE でファイル削除
   └─> フォルダの場合は再帰的に全ファイルを削除

6. 開いているタブをクローズ
   └─> editorStore.closeTab()

7. ファイルリストを更新
   └─> refetchFiles()
```

---

## ディレクトリ構造

### Frontend

```
frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (AuthProvider)
│   │   ├── page.tsx                  # Login page
│   │   ├── repository-setup/         # Repository selection
│   │   └── workspace/                # Main workspace
│   │
│   ├── components/
│   │   ├── atoms/                    # 基本コンポーネント
│   │   │   ├── Button/
│   │   │   └── Icon/
│   │   ├── molecules/                # 複合コンポーネント
│   │   │   ├── ConfirmDialog/
│   │   │   ├── ContextMenu/
│   │   │   ├── CreateFileInput/
│   │   │   └── LoadingScreen/
│   │   └── organisms/                # 大規模コンポーネント
│   │       ├── Editor/               # エディター
│   │       ├── Header/               # ヘッダー
│   │       └── Sidebar/              # サイドバー
│   │
│   ├── stores/                       # Zustand stores
│   │   ├── authStore.ts              # 認証状態
│   │   ├── editorStore.ts            # エディター状態
│   │   └── sidebarStore.ts           # サイドバー状態
│   │
│   ├── hooks/                        # Custom hooks
│   │   ├── useRequireAuth.ts
│   │   ├── useRequireRepositorySelection.ts
│   │   ├── useFileContent.ts
│   │   ├── useSaveFile.ts
│   │   ├── useCreateFile.ts
│   │   └── useDeleteFile.ts
│   │
│   ├── lib/                          # Utilities
│   │   ├── supabase.ts               # Supabase client
│   │   └── supabase-server.ts        # Supabase server client
│   │
│   ├── types/                        # TypeScript types
│   │   └── database.types.ts         # DB types
│   │
│   └── middleware.ts                 # Next.js middleware (OAuth)
│
└── package.json
```

### Backend

```
backend/
├── api/
│   ├── main.py                       # FastAPI app
│   ├── rag_system.py                 # ChromaDB integration
│   └── requirements.txt
├── data/                             # ChromaDB data
├── docker-compose.yml                # Development
├── docker-compose.prod.yml           # Production
└── Dockerfile
```

---

## 環境変数

### Frontend (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# GitHub (not needed - uses Supabase provider_token)
# GITHUB_TOKEN is obtained via OAuth
```

### Backend (`.env` / `.env.prod`)

```bash
# GitHub Personal Access Token
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# RAG API Key
RAG_API_KEY=test123

# OpenAI (Optional - for embeddings)
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

---

## デプロイメント

### Frontend (Vercel)

1. GitHub リポジトリを Vercel にインポート
2. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. デプロイ
4. Supabase Dashboard で Redirect URLs を設定:
   - `https://your-app.vercel.app`
   - `https://your-app-*.vercel.app` (preview URLs)

### Backend (VPS)

```bash
# SSH to VPS
ssh root@160.251.211.37

# Clone repository
cd /opt
git clone https://github.com/wasborn14/prj_text_editor_rag_v1.git
cd prj_text_editor_rag_v1/backend

# Setup environment
cp .env.example .env.prod
nano .env.prod  # Edit with your tokens

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f api
```

---

## セキュリティ

### 認証・認可

- **Supabase Auth**: Row Level Security (RLS) で各ユーザーのデータを保護
- **GitHub OAuth**: `repo read:user user:email` スコープで必要最小限の権限
- **Provider Token**: Supabase が GitHub Personal Access Token を保存
- **API Routes**: すべての API ルートで Supabase セッションを検証

### データ保護

- **RLS Policies**:
  ```sql
  -- Profiles: 自分のプロフィールのみアクセス可能
  CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

  -- User Repositories: 自分のリポジトリのみアクセス可能
  CREATE POLICY "Users can view own repositories"
    ON user_repositories FOR SELECT
    USING (auth.uid() = user_id);
  ```

- **GitHub API**: ユーザーの GitHub 権限に基づいてアクセス制御
- **HTTPS**: すべての通信を暗号化

---

## パフォーマンス最適化

### フロントエンド

- **React Query**:
  - データキャッシュ (5分間)
  - 自動リフェッチ
  - Optimistic Updates (将来実装予定)

- **Zustand**:
  - グローバル状態管理
  - パフォーマンスの良いセレクター
  - DevTools 統合

- **Next.js**:
  - Server Components
  - Image Optimization
  - Code Splitting

### バックエンド

- **ChromaDB**:
  - ベクトル検索の高速化
  - インメモリキャッシュ

- **Docker**:
  - メモリ制限 (800MB)
  - ヘルスチェック
  - 自動再起動

---

## 既知の問題と制限事項

### Frontend

1. **.gitkeep の表示**
   - フォルダ作成時に `.gitkeep` が作成される
   - サイドバーでは非表示に設定済み

2. **大きなファイルの処理**
   - GitHub API は 1MB 以上のファイルに制限あり
   - Base64 エンコーディングのオーバーヘッド

3. **リアルタイム同期**
   - 現在は手動リフレッシュのみ
   - 将来的に WebSocket 対応予定

### Backend

1. **メモリ制限**
   - VPS は 1GB RAM のみ
   - 大規模リポジトリの同期に時間がかかる

2. **Rate Limiting**
   - GitHub API の制限 (5000 req/hour)
   - ChromaDB の同時リクエスト制限

---

## 今後のロードマップ

### 短期 (1-2ヶ月)

- [ ] ファイル/フォルダのリネーム機能
- [ ] ドラッグ&ドロップでファイル移動
- [ ] キーボードショートカット拡充
- [ ] エラーハンドリングの改善（トースト通知）
- [ ] Optimistic UI の実装

### 中期 (3-6ヶ月)

- [ ] RAG 検索の UI 統合
- [ ] AI アシスタント機能
- [ ] リアルタイム同期（WebSocket）
- [ ] コラボレーション機能
- [ ] モバイル対応

### 長期 (6ヶ月以上)

- [ ] LangChain 統合
- [ ] マルチリポジトリサポート
- [ ] プラグインシステム
- [ ] Azure 移行
- [ ] セルフホスティングオプション

---

## 関連ドキュメント

### 認証・セットアップ
- [38_GITHUB_OAUTH_AUTHENTICATION.md](./38_GITHUB_OAUTH_AUTHENTICATION.md) - GitHub OAuth 認証フロー
- [22_SUPABASE_DATA_MANAGEMENT.md](./22_SUPABASE_DATA_MANAGEMENT.md) - Supabase データ管理
- [23_SUPABASE_SCHEMA_SETUP.md](./23_SUPABASE_SCHEMA_SETUP.md) - データベーススキーマ

### 機能実装
- [41_IMPLEMENTED_FEATURES_SUMMARY.md](./41_IMPLEMENTED_FEATURES_SUMMARY.md) - 実装済み機能まとめ
- [39_FILE_FOLDER_CREATION_PLAN.md](./39_FILE_FOLDER_CREATION_PLAN.md) - ファイル/フォルダ作成
- [40_FILE_DELETION_PLAN.md](./40_FILE_DELETION_PLAN.md) - ファイル/フォルダ削除
- [36_FILE_EDITOR_IMPLEMENTATION_PLAN.md](./36_FILE_EDITOR_IMPLEMENTATION_PLAN.md) - エディター実装

### アーキテクチャ
- [19_FRONTEND_ARCHITECTURE_CLEAN.md](./19_FRONTEND_ARCHITECTURE_CLEAN.md) - フロントエンドアーキテクチャ
- [27_ZUSTAND_MIGRATION_AND_ENHANCEMENTS.md](./27_ZUSTAND_MIGRATION_AND_ENHANCEMENTS.md) - Zustand 移行

### バックエンド
- [11_VPS_SETUP_GUIDE.md](./11_VPS_SETUP_GUIDE.md) - VPS セットアップ
- [08_VPS_RAG_TESTING_GUIDE.md](./08_VPS_RAG_TESTING_GUIDE.md) - RAG テストガイド
- [04_VPS_RAG_IMPLEMENTATION.md](./04_VPS_RAG_IMPLEMENTATION.md) - RAG 実装詳細

---

## 開発ガイドライン

### コーディング規約

- **TypeScript**: 厳格な型付け、`any` の使用を避ける
- **Component**: Atomic Design パターン (atoms/molecules/organisms)
- **Hooks**: カスタムフックで再利用可能なロジックを分離
- **State**: Zustand でグローバル状態、useState でローカル状態
- **API**: React Query でデータフェッチング
- **Styling**: Tailwind CSS、カスタム CSS は最小限に

### Git Workflow

1. `main` ブランチは常に本番環境の状態
2. 機能追加は feature ブランチから
3. コミットメッセージは明確に（英語推奨）
4. PR を作成してレビュー

### デバッグ

- **Frontend**: React DevTools, Zustand DevTools, React Query DevTools
- **Backend**: Docker logs (`docker-compose logs -f api`)
- **Database**: Supabase Dashboard
- **GitHub API**: GitHub API Rate Limit ヘッダーを確認

---

## サポート

- **GitHub Issues**: https://github.com/wasborn14/prj_text_editor_rag_v1/issues
- **ドキュメント**: `/docs` ディレクトリ
- **VPS**: `ssh root@160.251.211.37`

---

## ライセンス

MIT License

---

**最終更新**: 2025年10月4日
