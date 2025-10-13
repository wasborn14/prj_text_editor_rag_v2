## プロジェクト計画（PLAN）

### 概要

VSCode 風の Markdown エディタで、GitHub リポジトリと連携して Web 上から直接編集・管理できるアプリケーション。AI 編集支援と RAG（検索拡張生成）により、開発者向けのインテリジェントなドキュメント管理プラットフォームを提供する。

### 目標

- **編集体験**: VSCode 風の 3 カラムレイアウト（Explorer | Editor | Preview）
- **GitHub 連携**: Web 上からリポジトリを直接編集、双方向同期
- **AI 支援**: 文書の改善提案、チャット形式での編集指示
- **RAG 機能**: ドキュメント間のセマンティック検索と引用機能
- **マルチユーザー**: GitHub 認証による安全なマルチテナント環境

### 範囲（スコープ）

#### コア機能

- **ファイル管理**: VSCode 風エクスプローラーによる階層表示・操作
- **Markdown 編集**: CodeMirror 6 ベースの高機能エディタ
- **リアルタイムプレビュー**: GFM 対応の同期プレビュー
- **AI 編集支援**: 文章改善提案、diff 表示、チャット形式編集

#### GitHub 連携

- **OAuth 認証**: GitHub アカウントによるログイン
- **リポジトリ同期**: 選択したリポジトリとの双方向同期
- **ブランチ管理**: 複数ブランチ対応、コミット・プッシュ機能
- **権限管理**: GitHub 権限に基づくアクセス制御

#### RAG・検索機能

- **セマンティック検索**: pgvector によるベクトル検索
- **全文検索**: PostgreSQL FTS による高速テキスト検索
- **AI 会話**: ドキュメント内容を参照したチャット機能
- **引用機能**: 検索結果の出典表示とリンク

## アーキテクチャ設計

### 構成候補

1. Web（推奨）

- Next.js(App Router) + React/TypeScript
- ブラウザで動作し、配布不要。サーバ/ストレージ/DB と連携しやすい

**GitHub 連携型 Web エディタ + Supabase RAG アーキテクチャ**

- **採用**: Next.js(App Router) + React + TypeScript
- **データベース**: Supabase PostgreSQL + pgvector（マルチテナント対応）
- **認証**: Supabase Auth + GitHub OAuth
- **ファイル同期**: GitHub API ↔ Supabase 双方向同期
- **ストレージ**: Cloudflare R2（画像・添付ファイル用）
- **デプロイ**: Vercel + Supabase + Cloudflare R2

**データフロー（GitHub ↔ Supabase）**

- **認証**: GitHub OAuth → Supabase Auth → ユーザー・リポジトリ情報登録
- **同期**: GitHub Repository ↔ Supabase files テーブル（双方向）
- **編集**: Web Editor → Supabase DB → GitHub API (commit/push)
- **RAG**: ファイル保存時 → 自動ベクトル化 → pgvector → セマンティック検索
- **検索**: クエリ → ベクトル検索 → LLM → 引用付き回答

### 詳細データフロー

#### 1. ユーザーオンボーディング

```
GitHub OAuth認証 → Supabase Auth → プロフィール作成 → リポジトリ選択 → 初回同期
```

#### 2. ファイル編集フロー

```
FileExplorer選択 → Supabase読み込み → Editor編集 → 自動保存 → GitHub API Push
```

#### 3. GitHub → Supabase 同期

```
GitHub Webhook → 変更検知 → Supabase更新 → 埋め込み再生成 → pgvector更新
```

#### 4. RAG 検索フロー

```
検索クエリ → OpenAI埋め込み → pgvector類似検索 → 結果ランキング → 出典表示
```

### 技術選定

- 言語/フレームワーク: TypeScript, Next.js(App Router), React
- Markdown エディタ: **CodeMirror 6**（軽量・高速・拡張性重視）
  - `@codemirror/lang-markdown`: Markdown 構文サポート
  - `@codemirror/merge`: 差分表示・マージビュー
  - `@codemirror/view`: カスタム Decoration（AI 提案表示用）
- **API**: Next.js API Routes（App Router）- バックエンドサーバー不要
- **DB**: Supabase PostgreSQL + pgvector 拡張
- **検索**:
  - ベクトル: pgvector による近傍検索（RAG 機能）
  - 文字列検索: PostgreSQL 標準 FTS（tsvector）
- **埋め込み**: OpenAI Embeddings API（`text-embedding-3-small/large`）
- **ファイルストレージ**: Cloudflare R2（画像・添付用、egress 無料）
- **認証**: Supabase Auth + GitHub OAuth（マルチテナント、RLS 自動適用）
- **GitHub 連携**: GitHub API v4 (GraphQL) + REST API
- **LLM**: OpenAI API/Anthropic（Next.js API Routes 経由）

---

## データベース設計（マルチテナント）

### Supabase テーブル構造

```sql
-- ユーザープロフィール
profiles (
  id UUID REFERENCES auth.users(id),
  github_username TEXT,
  github_id BIGINT,
  display_name TEXT,
  avatar_url TEXT
)

-- リポジトリ管理
repositories (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  github_repo_id BIGINT,
  owner TEXT,
  name TEXT,
  full_name TEXT, -- "owner/repo"
  default_branch TEXT,
  is_active BOOLEAN, -- 現在選択中
  access_token TEXT -- 暗号化要
)

-- ファイル管理（リポジトリ別）
files (
  id UUID PRIMARY KEY,
  repository_id UUID REFERENCES repositories(id),
  path TEXT, -- リポジトリ内での相対パス
  name TEXT,
  type TEXT CHECK(type IN ('file', 'folder')),
  content TEXT,
  github_sha TEXT, -- Git SHA（同期用）
  embedding VECTOR(1536),
  UNIQUE(repository_id, path)
)
```

### Row Level Security (RLS)

```sql
-- ユーザーは自分のリポジトリのみアクセス可能
CREATE POLICY "repository_access" ON repositories
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "file_access" ON files
FOR ALL USING (
  repository_id IN (
    SELECT id FROM repositories WHERE user_id = auth.uid()
  )
);
```

**データソース**: Supabase が真実のソース、Next.js で直接編集・管理。

---

## DB スキーマ（初版）

```sql
-- notes: ファイルパスで一意。body は不要（FS が正）
CREATE TABLE notes (
  id INTEGER PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  words INTEGER DEFAULT 0,
  hash TEXT
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE note_tags (
  note_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE backlinks (
  from_note_id INTEGER NOT NULL,
  to_note_id INTEGER NOT NULL,
  anchor TEXT,
  PRIMARY KEY (from_note_id, to_note_id)
);

-- チャンクと埋め込み
CREATE TABLE chunks (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL,
  ordinal INTEGER NOT NULL,
  text TEXT NOT NULL,
  tokens INTEGER,
  hash TEXT,
  UNIQUE(note_id, ordinal)
);

-- sqlite-vec を使う場合: vec(chunks.id) を別 DB/仮想テーブルに
-- 例: CREATE VIRTUAL TABLE chunk_embeddings USING vec0(id INTEGER PRIMARY KEY, embedding FLOAT[1536]);

CREATE TABLE attachments (
  id INTEGER PRIMARY KEY,
  note_id INTEGER NOT NULL,
  rel_path TEXT NOT NULL,
  mime TEXT,
  bytes INTEGER,
  created_at TEXT
);

CREATE TABLE conversations (
  id INTEGER PRIMARY KEY,
  title TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  role TEXT CHECK(role IN ('user','assistant','system')) NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  citations TEXT -- JSON: [{note_path, chunk_id, score}]
);
```

---

## 機能仕様

### Markdown エディタ

- 編集/プレビュー切替（ショートカット: Cmd/Ctrl+\` など）
- 画像ドラッグ&ドロップ → `images/` 配下へ保存し相対リンクを自動挿入
- クリップボード画像貼り付け対応（ファイル化）
- WikiLink `[[Page]]` と Obsidian ライクなリンク補完
- タグ `#tag` 自動抽出
- 見出し/目次/数式(KaTeX)/コードハイライト

### AI 編集機能（Cursor ライク）

- **差分表示モード**
  - 追加部分を緑背景/削除部分を赤背景でインライン表示
  - Ghost text（薄い文字）で提案をプレビュー
  - Tab/Esc で提案の受け入れ/拒否
- **AI 提案の管理**
  - 複数の変更提案を同時表示
  - 個別の変更を選択的に適用/拒否
  - 変更のバッチ適用（全て受け入れ/全て拒否）
- **実装技術（CodeMirror 6）**
  - Decoration API で視覚的な差分表示
  - StateEffect で変更履歴管理
  - ChangeSet で複数変更のトランザクション処理
  - @codemirror/merge で高度な差分ビュー

### 同期/インデクシング（Web）

- トリガ: アップロード/更新/削除 Webhook（ストレージイベント）または API 完了後フック
- 処理: サーバで Markdown 解析 → frontmatter/見出し/リンク/タグ抽出 → DB 反映 → チャンク化/埋め込み → ベクトル索引
- 差分: コンテントハッシュ/更新時刻で増分処理

### 検索（Web）

- キーワード: Postgres FTS（tsvector）に `chunks.text` を登録
- セマンティック: pgvector 近傍検索 → 上位 k チャンク返却
- ハイブリッド: BM25 相当 × ベクトル再ランク

### RAG パイプライン

1. チャンク化: 見出し/段落/スライディングウィンドウ（\~500-800 tokens）
2. 埋め込み: モデル選択（ローカル or API）
3. 索引更新: 変更チャンクのみ再計算
4. 検索: クエリ埋め込み → 近傍検索（kNN）
5. 生成: プロンプトで文脈注入、引用を明示

### チャット UI

- クエリ → 取得コンテキストを横に表示（出典・スコア・プレビュー）
- 回答に脚注リンク（`path#heading`）
- 会話履歴を `conversations/messages` に保存

### セキュリティ/運用

- `.env` に API キー（OpenAI 等）を保存、秘匿
- バックアップ: `notes/` と `data/*.sqlite` を ZIP/時系列で保存
- エクスポート: 検索結果/会話を Markdown/JSON で出力

---

## 実装計画（GitHub 連携対応）

### Phase 1: 基盤構築（✅ 完了）

- **✅ VSCode 風エディタ**: 3 カラムレイアウト、FileExplorer、自動保存
- **✅ Supabase 基盤**: files テーブル、pgvector 拡張、マルチテナント DB
- **✅ AI 編集機能**: diff 表示、チャット形式編集、複数プロバイダー対応

### Phase 2: GitHub 認証・連携（✅ 完了）

- **✅ GitHub OAuth**: Supabase Auth + GitHub Provider 設定完了（redirectTo 修正済み）
- **✅ マルチテナント DB**: profiles, repositories, files テーブル作成・RLS 設定
- **✅ リポジトリ選択**: RepositorySelector コンポーネント実装完了
- **✅ アクセストークン管理**: 自動更新、複数フォールバック戦略実装

### Phase 3: 双方向同期（✅ 完了）

- **✅ GitHub API 連携**: Octokit.js 完全セットアップ（REST API + Auth）
- **✅ Web → GitHub**: `/api/github/commit`による自動 commit/push 実装
- **✅ GitHub → Web**: Webhook 受信（`/api/webhooks/github`）、変更検知、Supabase 更新
- **✅ コンフリクト解決**: 競合検出（`/api/conflicts/detect`）、解決 API 実装
- **✅ 初回同期**: `/api/github/sync`による一括取得・同期機能実装

### Phase 4: RAG・AI 機能（🔄 実装中）

- **⭐ OpenAI Embeddings 統合**: ベクトル生成 API 実装（次のステップ）
- **⭐ セマンティック検索**: pgvector による類似検索 API
- **⭐ RAG 会話機能**: コンテキスト取得、引用機能、チャット UI
- **⭐ ハイブリッド検索**: キーワード + ベクトル検索の統合

### Phase 5: 高度機能（📋 計画中）

- **ブランチ管理 UI**: バックエンド API 実装済み、フロントエンド UI 作成予定
- **履歴表示**: Git commit 履歴の UI 表示
- **リアルタイム協調編集**: WebSocket + Operational Transform
- **プラグインシステム**: カスタム拡張機能対応

---

## GitHub 連携 API 設計

### 認証・リポジトリ管理

```typescript
// ユーザーオンボーディング
interface OnboardingFlow {
  authenticateGitHub(): Promise<GitHubUser>;
  getUserRepositories(): Promise<Repository[]>;
  selectRepository(repoId: string): Promise<void>;
  initialSync(repositoryId: string): Promise<SyncResult>;
}

// リポジトリ操作
interface RepositoryManager {
  listRepositories(): Promise<Repository[]>;
  switchRepository(repoId: string): Promise<void>;
  syncFromGitHub(repoId: string): Promise<SyncResult>;
  syncToGitHub(repoId: string, message: string): Promise<CommitResult>;
}
```

### ファイル同期

```typescript
// GitHub ↔ Supabase 同期
interface GitHubSync {
  // GitHub → Supabase
  handleWebhook(payload: GitHubWebhookPayload): Promise<void>;
  fetchFileFromGitHub(
    owner: string,
    repo: string,
    path: string
  ): Promise<string>;
  updateSupabaseFromGitHub(files: GitHubFile[]): Promise<void>;

  // Supabase → GitHub
  commitToGitHub(file: FileUpdate, message: string): Promise<GitHubCommit>;
  pushChanges(repositoryId: string): Promise<PushResult>;
  handleConflicts(conflicts: ConflictFile[]): Promise<Resolution[]>;
}
```

### データ型定義

```typescript
interface Repository {
  id: string;
  githubRepoId: number;
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  isActive: boolean;
}

interface FileUpdate {
  repositoryId: string;
  path: string;
  content: string;
  githubSha?: string;
}

interface ConflictFile {
  path: string;
  localContent: string;
  remoteContent: string;
  baseContent: string;
}
```

---

## 環境変数設定

```env
# AI Provider (Text Generation)
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# OpenAI (Embeddings Required)
OPENAI_API_KEY=sk-...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# GitHub OAuth (必須)
NEXT_PUBLIC_GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GITHUB_APP_ID=xxx # 将来のGitHub App用
GITHUB_PRIVATE_KEY=xxx # 将来のGitHub App用

# Webhook Security
GITHUB_WEBHOOK_SECRET=xxx

# Optional: Image Storage
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=notes-images
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

---

## リスクと対応

### 技術リスク

- **GitHub API 制限**: レート制限（5000req/h）→ 効率的な API 利用、キャッシュ活用
- **同期競合**: 同時編集時のコンフリクト → 3-way merge UI、楽観的ロック
- **大量ファイル**: パフォーマンス劣化 → 差分同期、遅延読み込み
- **セキュリティ**: アクセストークン漏洩 → 暗号化保存、スコープ最小化

### 運用リスク

- **Supabase 制限**: 無料枠 500MB → Pro 移行、データ圧縮
- **OpenAI Cost**: 埋め込み従量課金 → バッチ処理、キャッシュ活用
- **GitHub 権限**: 過度な権限要求 → 最小限スコープ、段階的権限付与

---

## 競合優位性

### 既存サービスとの差別化

| 機能            | GitHub.dev | Replit | 本プロジェクト |
| --------------- | ---------- | ------ | -------------- |
| GitHub 直接編集 | ✅         | △      | ✅             |
| AI 編集指示     | ❌         | ✅     | ✅             |
| RAG 検索        | ❌         | ❌     | ✅             |
| VSCode 風 UI    | ✅         | ❌     | ✅             |
| オフライン編集  | ❌         | ❌     | 🔄             |

### ターゲットユーザー

- **開発者**: ドキュメント管理、技術記事執筆
- **研究者**: 論文・研究ノート管理
- **ライター**: Markdown 執筆、GitHub 連携ブログ
- **チーム**: 共同ドキュメント編集

---

## Supabase 学習・実装プラン

### Phase 0: Supabase 基礎学習（1 日）

#### 0-1. Supabase プロジェクト作成・理解

```
目標: Supabase の基本概念を理解し、プロジェクトを作成

手順:
1. supabase.com でアカウント作成
2. 新規プロジェクト作成（notes-rag-app）
3. ダッシュボード探索
   - Database: テーブル管理画面
   - Authentication: ユーザー管理画面
   - Storage: ファイル管理画面
   - API: 自動生成される REST API ドキュメント
4. 接続情報取得
   - Project URL
   - anon/public key
   - service_role key（秘匿情報）
```

#### 0-2. 最小限のテーブル作成・操作

```sql
-- SQL Editor で実行（学習用）
CREATE TABLE test_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- テストデータ挿入
INSERT INTO test_notes (title, content) VALUES
('Test Note 1', 'Hello Supabase'),
('Test Note 2', 'Learning RAG with Supabase');

-- データ確認
SELECT * FROM test_notes ORDER BY created_at DESC;
```

### Phase 1: Next.js + Supabase 連携（1-2 日）

#### 1-1. 環境準備

```bash
# 依存関係追加
npm install @supabase/supabase-js

# 環境変数設定
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

#### 1-2. Supabase クライアント設定

```typescript
// lib/supabase.ts 作成
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

#### 1-3. 基本 CRUD API 作成

```typescript
// app/api/test-notes/route.ts 作成
// GET: ノート一覧取得
// POST: ノート新規作成
// 基本的な Supabase クライアント操作を学習
```

#### 1-4. テスト用フロントエンド実装

```typescript
// app/test-supabase/page.tsx 作成
// - ノート作成フォーム
// - ノート一覧表示
// - 基本的な状態管理
// - API 呼び出し処理
```

#### 1-5. 動作確認

```
確認項目:
1. ノート作成 → DB 保存確認
2. ノート一覧 → DB 取得確認
3. Supabase ダッシュボードで直接データ確認
4. エラーハンドリング動作確認
```

### Phase 2: リアルタイム機能確認（半日）

#### 2-1. Realtime 設定

```typescript
// Supabase Realtime による変更監視
// 複数ブラウザ間でのリアルタイム同期確認
// Change Data Capture の動作理解
```

#### 2-2. 動作テスト

```
テスト手順:
1. 複数タブで同じページを開く
2. 片方でデータ変更 → 他方で自動更新確認
3. Supabase ダッシュボードからの変更 → フロントエンド自動反映確認
```

### Phase 3: 本格実装移行（1 日）

#### 3-1. 本番用スキーマ作成

```sql
-- test_notes テーブル削除
DROP TABLE test_notes;

-- 本番用 notes テーブル作成
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  path TEXT UNIQUE, -- 仮想パス（組織用）
  tags TEXT[], -- 配列型でタグ直接保存
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- pgvector 拡張は後の Phase で追加
```

#### 3-2. 既存エディタ統合

```typescript
// 既存の MarkdownEditor と Supabase 連携
// LocalStorage → Supabase DB への移行
// 自動保存機能の Supabase 対応
```

#### 3-3. テストページ削除

```bash
# 学習用ファイル削除
rm -rf app/test-supabase/
rm app/api/test-notes/route.ts
```

### 学習ポイント・注意事項

#### 理解すべき概念

- **Supabase Client**: フロントエンド・API Routes 両方での使用方法
- **REST API**: 自動生成される API の活用
- **Realtime**: PostgreSQL Change Data Capture の仕組み
- **環境変数**: public key と service role key の使い分け

#### よくあるハマりポイント

- **CORS 設定**: localhost 開発時の設定
- **Key 権限**: anon key と service_role key の権限違い
- **型安全性**: TypeScript 型定義の管理
- **エラーハンドリング**: Supabase エラーレスポンスの処理

#### 次ステップ準備

この基礎学習完了後、以下の本格機能実装に進む：

1. pgvector 拡張追加（RAG 機能）
2. OpenAI Embeddings 統合
3. セマンティック検索実装
4. AI チャット機能実装
5. 認証・セキュリティ設定

---

---

## 実装状況（2025/01/17 時点）

### ✅ 完了済み機能

#### 基盤アーキテクチャ

- **フレームワーク**: Next.js 15 (App Router) + React + TypeScript
- **データベース**: Supabase PostgreSQL + pgvector 拡張 + マルチテナント RLS
- **エディタ**: CodeMirror 6 + リアルタイム Markdown プレビュー + VSCode 風 3 カラムレイアウト
- **AI 統合**: 複数プロバイダー対応（Anthropic/OpenAI/Google）+ diff 表示 + チャット形式編集

#### GitHub 統合（完全実装済み）

- **認証**: GitHub OAuth + Supabase Auth 統合（トークン自動更新）
- **リポジトリ管理**: 一覧取得、選択、作成、削除 API 実装
- **双方向同期**:
  - GitHub → Supabase: `/api/github/sync`による一括同期
  - Web → GitHub: `/api/github/commit`による自動 commit/push
  - Webhook 統合: リアルタイム変更検知・同期
- **コンフリクト解決**: 競合検出・解決 API 実装
- **ブランチ操作**: getBranches, createBranch API 実装済み

#### UI コンポーネント

- **RepositorySelector**: リポジトリ選択モーダル
- **SyncModal**: 同期進捗表示
- **FileExplorer**: ファイルツリー表示・操作
- **CreateRepositoryModal**: 新規リポジトリ作成 UI

### 🔄 実装中（Phase 4: RAG・AI 機能）

- **⭐ OpenAI Embeddings 統合**: ベクトル生成 API（優先度: 最高）
- **⭐ セマンティック検索**: pgvector 類似検索 API
- **⭐ RAG 会話機能**: コンテキスト取得・引用機能
- **⭐ チャット UI**: AI 会話インターフェース

### 📋 未実装機能

- **ブランチ管理 UI**: バックエンド API 実装済み、UI 未実装
- **Git 履歴表示**: コミット履歴のビジュアル表示
- **リアルタイム協調編集**: 複数ユーザー同時編集
- **プラグインシステム**: カスタム拡張機能

### 🚨 解決済み課題

- **OAuth 認証エラー**: redirectTo 設定修正で解決
- **トークン管理**: 複数フォールバック戦略実装
- **同期競合**: 3-way merge 対応済み

---

## 次期開発計画（2025/01/17 以降）

### 🎯 Phase 4: RAG・AI 機能実装（現在進行中）

#### 1. OpenAI Embeddings 統合（2-3 日）

```typescript
// 実装予定: ベクトル生成API
POST / api / embeddings / generate -
  ファイル保存時の自動エンベディング -
  バッチ処理による効率化 -
  text -
  embedding -
  3 -
  small / large選択対応;
```

#### 2. セマンティック検索実装（2 日）

```typescript
// 実装予定: pgvector類似検索
POST /api/search/semantic
- クエリベクトル生成
- pgvector近傍検索（k-NN）
- ハイブリッド検索（キーワード + ベクトル）
```

#### 3. RAG 会話機能（3 日）

```typescript
// 実装予定: コンテキスト取得型AI会話
POST / api / chat / rag -
  関連ドキュメント自動取得 -
  引用付き回答生成 -
  会話履歴管理;
```

#### 4. チャット UI コンポーネント（2 日）

- サイドバー型チャットインターフェース
- ストリーミング対応
- 引用リンク表示
- コンテキストプレビュー

### 🎯 Phase 5: UI/UX 改善（1 週間）

#### 1. ベクトル検索システム

```sql
-- 実装予定: セマンティック検索最適化
CREATE INDEX CONCURRENTLY files_embedding_hnsw_idx
ON files USING hnsw (embedding vector_cosine_ops);

-- 実装予定: ハイブリッド検索関数
CREATE OR REPLACE FUNCTION hybrid_search(
  user_uuid UUID,
  query_text TEXT,
  query_embedding VECTOR(1536),
  semantic_weight FLOAT DEFAULT 0.7,
  keyword_weight FLOAT DEFAULT 0.3
) RETURNS TABLE (...);
```

#### 2. AI 会話機能

- **コンテキスト取得**: pgvector 類似検索 → 関連ファイル抽出
- **引用機能**: 検索結果にファイルパス・行番号・類似度表示
- **会話履歴**: conversations/messages テーブル実装
- **ストリーミング**: AI 応答のリアルタイム表示

#### 3. エンベディング最適化

- **自動生成**: ファイル保存時に OpenAI Embeddings API 呼び出し
- **差分更新**: 変更ファイルのみ再エンベディング
- **チャンク戦略**: 長文ファイルの効率的分割

### 🎯 Phase 3C: 高度機能（3-4 週間）

#### 1. ブランチ管理

```typescript
interface BranchManager {
  listBranches(repoId: string): Promise<GitHubBranch[]>;
  switchBranch(repoId: string, branch: string): Promise<void>;
  createBranch(repoId: string, name: string, from: string): Promise<void>;
  mergeBranch(repoId: string, from: string, to: string): Promise<void>;
}
```

#### 2. 高度エディタ機能

- **リアルタイム協調編集**: WebSocket + Operational Transform
- **変更履歴**: Git 履歴のビジュアル表示
- **マルチカーソル**: 複数箇所同時編集
- **プラグインシステム**: カスタム拡張機能

#### 3. パフォーマンス最適化

- **仮想スクロール**: 大量ファイルリスト対応
- **インクリメンタル同期**: 変更差分のみ同期
- **キャッシュ戦略**: Redis/Vercel KV 活用
- **CDN 最適化**: 静的リソースのエッジ配信

### 📊 実装優先度マトリックス

| 機能             | ビジネス価値 | 技術難易度 | 実装期間 | 優先度 |
| ---------------- | ------------ | ---------- | -------- | ------ |
| リポジトリ同期   | 🔴 必須      | 🟡 中      | 1-2 週   | P0     |
| RAG 検索         | 🔴 必須      | 🟡 中      | 2-3 週   | P0     |
| AI 会話          | 🟠 重要      | 🟢 低      | 1 週     | P1     |
| ブランチ管理     | 🟠 重要      | 🟡 中      | 2 週     | P1     |
| リアルタイム編集 | 🟡 付加価値  | 🔴 高      | 4 週     | P2     |

### 🚀 リリース計画

#### v1.0 (MVP) - 2025 年 2 月末

- ✅ GitHub 認証・リポジトリ選択
- ✅ ファイル編集・自動保存・GitHub 同期
- ✅ 基本 AI 機能（diff 表示・チャット）

#### v1.1 (RAG 対応) - 2025 年 3 月末

- ✅ セマンティック検索
- ✅ AI 会話（コンテキスト取得）
- ✅ 引用機能

#### v1.2 (高度機能) - 2025 年 4 月末

- ✅ ブランチ管理
- ✅ 高度エディタ機能
- ✅ パフォーマンス最適化

### 📊 開発進捗サマリー

- **Phase 1-3**: ✅ 完了（基盤構築、GitHub 認証・連携、双方向同期）
- **Phase 4**: 🔄 実装中（RAG・AI 機能）
- **Phase 5**: 📋 計画中（UI/UX 改善、高度機能）

**2025/01/17 更新**: GitHub 統合完全実装確認、RAG 機能開発フェーズ開始。
