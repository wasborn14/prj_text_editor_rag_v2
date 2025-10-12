# 開発の流れ総括

**作成日**: 2025年10月13日
**プロジェクト**: RAG-Powered Markdown Editor with GitHub Integration

---

## エグゼクティブサマリー

本プロジェクトは、GitHub統合とVPS上のRAG（検索拡張生成）機能を備えたMarkdownエディターの開発です。VSCode風の3カラムレイアウト、リアルタイム編集、セマンティック検索を特徴とし、Webブラウザから直接GitHubリポジトリを編集できる環境を提供します。

**現在のステータス**: 主要機能実装済み、継続的改善中
**技術スタック**: Next.js 15.5.3 + React 19.1.0 + Supabase + FastAPI + ChromaDB
**デプロイ環境**: Vercel (Frontend) + ConoHa VPS (Backend RAG)
**プロジェクト**: prj_text_editor_rag_v2（v1から進化継続）

---

## I. プロジェクト初期構想（2025年9月）

### 1.1 プロジェクトの目標

**コンセプト**:
- VSCode風のMarkdownエディターをWebで実現
- GitHub リポジトリとの双方向同期
- AI編集支援機能（Cursor ライク）
- RAG機能によるセマンティック検索とチャット

**主な機能要件**:
- ファイル管理: VSCode風エクスプローラーによる階層表示・操作
- Markdown編集: CodeMirror 6ベースの高機能エディタ → Novel(TipTap)へ変更
- GitHub連携: OAuth認証、双方向同期、ブランチ管理
- RAG: pgvector/ChromaDBによるベクトル検索、AI会話

### 1.2 アーキテクチャ選定

**初期案**:
- **Frontend**: Next.js (App Router) + React + TypeScript
- **Database**: Supabase PostgreSQL + pgvector拡張（マルチテナント）
- **認証**: Supabase Auth + GitHub OAuth
- **RAG**: OpenAI Embeddings + pgvector検索

**技術選定の理由**:
- Next.js App Router: 最新のフルスタックReactフレームワーク
- Supabase: 高速なPostgreSQL + Row Level Security (RLS)
- pgvector: PostgreSQL上でベクトル検索が可能

---

## II. VPS環境構築（2025年9月21日）

### 2.1 VPSセットアップ

**環境**:
- **プロバイダー**: ConoHa VPS
- **プラン**: 2Core / 1GB RAM / 100GB SSD
- **OS**: Ubuntu 24.04
- **IP**: 160.251.211.37
- **コスト**: 6,092円（12ヶ月）

### 2.2 セキュリティ設定の課題と解決

**課題1: SSH接続失敗**
- **原因**: ConoHaのセキュリティグループ未設定
- **解決**: "IPv4v6-SSH"グループを選択

**課題2: パスワード認証が無効にならない**
- **原因**: `/etc/ssh/sshd_config.d/50-cloud-init.conf`が設定を上書き
- **解決**: cloud-initファイルを`.backup`にリネーム

**課題3: SSH サービス停止**
- **原因**: systemdユニット変更時の手順ミス
- **解決**: ConoHaコンソールから復旧

### 2.3 完了したセキュリティ設定

- ✅ SSH鍵認証（id_conoha_rag_202509）
- ✅ パスワード認証無効化
- ✅ root ログイン無効化
- ✅ 非rootユーザー（wasborn）作成
- ✅ Docker/Docker Compose インストール
- ✅ UFW ファイアウォール設定
- ✅ fail2ban導入
- ✅ タイムゾーン設定（Asia/Tokyo）

**GitHub リポジトリ**:
- URL: https://github.com/wasborn14/prj_text_editor_rag_v1
- 現在のディレクトリ名: prj_text_editor_rag_v2（v1から改名）
- Personal Access Token設定完了

---

## III. バックエンドRAG実装（2025年9月〜10月）

### 3.1 VPS RAGシステム

**アーキテクチャ**:
```
FastAPI (Port 8001)
├── ChromaDB (Vector Store)
├── PyGithub (GitHub API)
└── OpenAI Embeddings (Optional)
```

**Docker構成**:
- **開発**: `docker-compose.yml`（ポート公開）
- **本番**: `docker-compose.prod.yml`（localhostバインド、メモリ制限800MB）

### 3.2 主要エンドポイント

**API仕様**:
```typescript
GET /health              // ヘルスチェック
POST /api/search         // セマンティック検索
POST /api/sync           // リポジトリ同期（非同期ジョブ）
GET /api/sync/status/:id // 同期ステータス取得
```

**認証**:
- Bearer Token: `test123`（環境変数 `RAG_API_KEY`）

### 3.3 同期処理の設計

**課題**: 大規模リポジトリの同期に時間がかかる

**解決策**:
- 非同期ジョブシステム導入（メモリベース）
- ジョブID発行 → ポーリングでステータス取得
- 1時間で古いジョブ情報を自動削除

**フロー**:
```
1. POST /api/sync → job_id 返却
2. GET /api/sync/status/{job_id} → ポーリング（3秒×60回）
3. status: "processing" | "completed" | "error"
4. 完了時、Supabaseに同期履歴を保存
```

### 3.4 デプロイスクリプト

**`deployment/scripts/deploy_vps.sh`**:
- ローカルマシンから実行
- SSH経由でVPSにコマンド送信
- git pull → Docker build → コンテナ再起動 → ヘルスチェック

---

## IV. フロントエンド基盤構築（2025年9月〜10月）

### 4.1 認証システム（GitHub OAuth）

**フロー**:
```
1. ユーザーが「Continue with GitHub」クリック
   ↓
2. Supabase Auth → GitHub OAuth
   ↓
3. GitHub認証・承認（scope: repo read:user user:email）
   ↓
4. Supabase が provider_token（GitHub PAT）を発行
   ↓
5. アプリにリダイレクト（/?code=xxx）
   ↓
6. middleware.ts でコールバック処理
   ↓
7. セッション確立 → /workspace へリダイレクト
```

**Supabase設定**:
- **Site URL**: `https://prj-text-editor-rag-v1.vercel.app`
- **Redirect URLs**: localhost、本番URL、プレビューURL（ワイルドカード）

**トラブルシューティング**:
- **問題**: ログインボタンを押しても何も起きない
- **原因**: Redirect URLsリストに未登録
- **解決**: 各デプロイURLを追加

### 4.2 データベース設計

**Supabaseテーブル**:

```sql
-- プロフィール
profiles (
  id UUID REFERENCES auth.users(id),
  github_username TEXT,
  github_id BIGINT UNIQUE,
  display_name TEXT,
  avatar_url TEXT
)

-- ユーザーリポジトリ
user_repositories (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  github_repo_id BIGINT,
  owner TEXT,
  name TEXT,
  full_name TEXT,
  is_selected BOOLEAN DEFAULT FALSE
)

-- RAG同期ステータス
repository_sync_status (
  id UUID PRIMARY KEY,
  repository TEXT UNIQUE NOT NULL,
  last_synced_at TIMESTAMPTZ,
  last_sync_status TEXT,
  files_count INTEGER
)
```

**Row Level Security (RLS)**:
- ユーザーは自分のデータのみアクセス可能
- `auth.uid()`でユーザーIDを取得

### 4.3 状態管理の移行（Context API → Zustand）

**移行理由**:
- Context APIの複雑化とパフォーマンス課題
- より型安全なstate管理
- devtoolsでのデバッグ容易化

**Zustand Store**:
```typescript
interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  githubToken: string | null

  // Actions
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  ensureProfile: (user: User) => Promise<void>
  initialize: () => Promise<void>
}
```

**効果**:
- コード量 40%削減
- TypeScript型安全性向上
- 将来のstate追加が容易

---

## V. ワークスペース実装（2025年10月）

### 5.1 レイアウト設計

**VSCode風 3カラム**:
```
┌─────────────────────────────────────────────────────┐
│  Header (User Profile + Repository Name)            │
├──────────────┬───────────────────────┬──────────────┤
│   Sidebar    │   Editor Area         │  RAG Panel   │
│              │                       │              │
│  • File Tree │  ┌─────────────────┐  │  • Search    │
│  • Search    │  │  Tab Bar        │  │  • Chat      │
│  • Create    │  ├─────────────────┤  │  • Sync      │
│  • Rename    │  │                 │  │              │
│  • Delete    │  │  Novel Editor   │  │              │
│              │  │                 │  │              │
└──────────────┴───────────────────────┴──────────────┘
```

### 5.2 サイドバー機能

**ファイルツリー**:
- GitHub APIでリポジトリ構造を取得
- ディレクトリの展開/折りたたみ
- ドットファイル（`.gitkeep`, `.gitignore`）の自動非表示
- 選択状態の視覚的フィードバック（青いハイライト）

**ファイル/フォルダ作成**:
- FilePlus/FolderPlus ボタン
- インライン入力フィールド
- 自動で `.md` 拡張子を追加
- バリデーション（無効文字、文字数制限、ドットファイル禁止）
- 選択中のディレクトリ内に作成
- 閉じているディレクトリは自動展開

**ファイル/フォルダ名前変更**:
- 右クリックメニューから「Rename」
- インライン編集モード
- ファイル拡張子の自動選択
- エディタで開いているタブのパスも自動更新
- フォルダ名変更時は配下の全ファイルのパスも更新

**ファイル/フォルダ削除**:
- 右クリックメニューから「Delete」
- 削除確認ダイアログ
- ローディング表示（"Deleting..."）
- 開いているタブの自動クローズ
- フォルダ削除時は配下の全ファイルを再帰的に削除

### 5.3 エディター機能

**Novel エディター** (TipTap ベース):
- WYSIWYG Markdown エディター
- リアルタイムプレビュー
- スラッシュコマンド
- テーブルサポート

**マルチタブ対応**:
- 複数ファイルを同時に開く
- タブ間の切り替え
- タブのクローズ
- isDirty 表示（未保存変更）

**自動保存**:
- 変更検知（isDirty フラグ）
- 保存ボタン（Cmd/Ctrl + S）
- GitHub への直接保存
- SHA管理（競合防止）

### 5.4 RAG パネル

**3つのタブ**:

**1. Search タブ**:
- セマンティック検索
- VPS の ChromaDB を使用
- 検索結果の表示（関連度スコア付き）
- クリックでファイルを開く

**2. Chat タブ**:
- AI チャット（コンテキスト付き）
- 会話履歴表示
- ソース表示（参照元ファイル）
- Markdown対応

**3. Sync タブ**:
- リポジトリの同期
- 非同期ジョブ処理（ポーリング方式）
- 同期履歴の表示（Supabaseに保存）
- 最終同期時刻の表示

**同期フロー**:
```
1. ユーザーが「Sync」ボタンをクリック
2. /api/rag/sync を呼び出し（VPS プロキシ）
3. VPS がバックグラウンドジョブを開始 → job_id 返却
4. フロントエンドがポーリング開始（3秒×60回、最大3分）
5. ジョブ完了時、Supabase に履歴を保存
6. React Query でキャッシュを invalidate
```

---

## VI. GitHub API統合

### 6.1 API Routes（Next.js）

**認証・プロフィール**:
- `GET /api/profile` - ユーザープロフィール取得
- `PUT /api/profile` - プロフィール更新
- `POST /api/profile` - プロフィール新規作成

**リポジトリ管理**:
- `GET /api/repositories` - ユーザーのリポジトリ一覧
- `POST /api/repositories/select` - リポジトリ選択
- `GET /api/repositories/selected` - 選択中のリポジトリ
- `GET /api/repositories/{id}/files` - ファイル構造取得

**ファイル操作**:
- `GET /api/github/file-content` - ファイル内容取得
- `POST /api/github/save-file` - ファイル保存
- `POST /api/github/create-file` - ファイル/フォルダ作成
- `POST /api/github/rename-file` - ファイル/フォルダ名前変更
- `DELETE /api/github/delete-file` - ファイル/フォルダ削除

**RAG統合**:
- `POST /api/rag/search` - セマンティック検索（VPSプロキシ）
- `POST /api/rag/chat` - AIチャット（VPSプロキシ）
- `POST /api/rag/sync` - リポジトリ同期（VPSプロキシ）
- `GET /api/rag/sync/status/{job_id}` - 同期ステータス取得

### 6.2 ファイル操作の実装詳細

**ファイル作成**:
```typescript
POST /api/github/create-file
Body: {
  owner, repo, path,
  content?, // ファイルの場合
  type: 'file' | 'folder'
}
// フォルダ作成時は `.gitkeep` を含む
```

**ファイル名前変更**:
```typescript
POST /api/github/rename-file
Body: {
  owner, repo,
  oldPath, newPath,
  type: 'file' | 'dir',
  message?
}
// 内部的には「コピー + 削除」
// フォルダの場合は配下の全ファイルを再帰的に処理
```

**ファイル削除**:
```typescript
DELETE /api/github/delete-file
Body: {
  owner, repo, path,
  type: 'file' | 'dir'
}
// フォルダは再帰的に削除
```

### 6.3 セッション管理の改善

**課題**: APIコール時に401エラー（セッション期限切れ）

**解決策**:
- 各API呼び出し前に `supabase.auth.getSession()` を実行
- セッション期限が近い場合、自動更新
- 1時間ごとに自動リフレッシュ

---

## VII. V2リビルド戦略（2025年10月5日）

### 7.1 実装の進化

**実装アプローチ**:
- 当初V2リビルド計画があったが、現在は継続的改善アプローチを採用
- Atomic Designパターンを採用（atoms/molecules/organisms/templates）
- 段階的なリファクタリングで技術的負債を管理
- 実装を進めながらアーキテクチャを最適化

**現在の設計パターン**:
```
frontend/src/components/
├── atoms/           # 基本コンポーネント
├── molecules/       # 複合コンポーネント
├── organisms/       # 大規模コンポーネント
└── templates/       # ページテンプレート
```

**実装の特徴**:
- Atomic Designで責務を明確に分離
- 各コンポーネントは再利用性を重視
- Zustandで状態管理を一元化
- React Query でサーバー状態を管理

### 7.2 現在の技術スタック

| 項目 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 15.5.3 | フルスタックReactフレームワーク |
| React | 19.1.0 | UIライブラリ |
| TypeScript | 5.x | 型安全な開発 |
| Zustand | 5.0.8 | 状態管理 |
| TanStack React Query | 5.90.2 | サーバー状態管理 |
| Tailwind CSS | 4.x | スタイリング |
| Novel | 1.0.2 | Markdownエディタ（TipTapベース） |
| Supabase | 2.57.4 | 認証・データベース |
| Octokit | 22.0.0 | GitHub API |
| Lucide React | 0.544.0 | アイコン |
| React Hook Form | 7.63.0 | フォーム管理 |
| Zod | 4.1.11 | バリデーション |

### 7.3 コンポーネント設計

**Atomic Design パターン**:
```
frontend/src/components/
├── atoms/                      # 基本UI要素
│   ├── Button/
│   ├── Input/
│   ├── Icon/
│   ├── Avatar/
│   ├── LoadingSpinner/
│   ├── Toast/
│   └── ToggleButton/
├── molecules/                  # 複合コンポーネント
│   ├── ConfirmDialog/
│   ├── ContextMenu/
│   ├── CreateFileInput/
│   ├── RenameInput/
│   ├── LoadingScreen/
│   └── RepositoryItem/
├── organisms/                  # 大規模機能コンポーネント
│   ├── Editor/
│   ├── Sidebar/
│   ├── Header/
│   ├── RAGPanel/
│   └── RepositorySelector/
└── templates/                  # ページテンプレート
```

---

## VIII. 実装済み機能（2025年10月現在）

### 8.1 コア機能

**認証・プロフィール**:
- ✅ GitHub OAuth 認証
- ✅ Supabase Auth 統合
- ✅ プロフィール自動作成・更新
- ✅ セッション自動更新

**リポジトリ管理**:
- ✅ リポジトリ一覧取得
- ✅ リポジトリ選択
- ✅ リポジトリ作成（GitHub API）

**ファイル操作**:
- ✅ ファイルツリー表示
- ✅ ファイル読み込み
- ✅ ファイル保存（SHA管理）
- ✅ ファイル/フォルダ作成
- ✅ ファイル/フォルダ名前変更
- ✅ ファイル/フォルダ削除

**エディター**:
- ✅ Novel エディター統合
- ✅ マルチタブ対応
- ✅ 自動保存
- ✅ リアルタイムプレビュー

**RAG機能**:
- ✅ セマンティック検索
- ✅ 非同期リポジトリ同期
- ✅ 同期ステータス表示
- ✅ 同期履歴保存（Supabase）

### 8.2 UI/UXコンポーネント

**Atomic Design パターン**:
- **Atoms**: Button, Input, Icon, Avatar, LoadingSpinner, Toast, ToggleButton
- **Molecules**: ConfirmDialog, ContextMenu, CreateFileInput, RenameInput, LoadingScreen, RepositoryItem
- **Organisms**: Sidebar, Editor, Header, RAGPanel, RepositorySelector
- **Templates**: （必要に応じて追加予定）

**共通機能**:
- ✅ ローディング画面
- ✅ エラーハンドリング
- ✅ コンテキストメニュー（右クリック）
- ✅ 確認ダイアログ
- ✅ インライン編集

---

## IX. 未実装・今後の拡張

### 9.1 短期（1-2ヶ月）

- [ ] ドラッグ&ドロップでファイル移動
  - **ライブラリ**: @dnd-kit/core
  - **対応**: モバイル（長押し500ms）+ デスクトップ
- [ ] キーボードショートカット拡充
- [ ] エラーハンドリングの改善（トースト通知）
- [ ] Optimistic UI の実装

### 9.2 中期（3-6ヶ月）

- [ ] RAG チャット機能の強化
- [ ] AI アシスタント機能（コード補完）
- [ ] リアルタイム同期（WebSocket）
- [ ] コラボレーション機能（複数ユーザー同時編集）
- [ ] モバイルアプリ対応

### 9.3 長期（6ヶ月以上）

- [ ] LangChain 統合
- [ ] マルチリポジトリサポート
- [ ] プラグインシステム
- [ ] セルフホスティングオプション

---

## X. 技術的考慮事項

### 10.1 パフォーマンス最適化

**フロントエンド**:
- React Query: データキャッシュ（5分間）、自動リフェッチ
- Zustand: パフォーマンスの良いセレクター
- Next.js: Server Components、Code Splitting、Edge Runtime

**バックエンド**:
- ChromaDB: インメモリキャッシュ
- FastAPI: BackgroundTasks で非同期処理
- Docker: メモリ制限（800MB）、ヘルスチェック

### 10.2 セキュリティ

**認証・認可**:
- Supabase RLS: 各ユーザーのデータを自動保護
- GitHub OAuth: 必要最小限のスコープ（`repo read:user user:email`）
- API Routes: すべてのルートでSupabaseセッション検証

**データ保護**:
- HTTPS: すべての通信を暗号化
- VPS API: Bearer Token 認証
- 環境変数: `.env` に秘密情報を保存

### 10.3 既知の制限事項

**Frontend**:
- ドットファイルの非表示（`.gitkeep`, `.gitignore`）
- 大きなファイルの処理（GitHub API: 1MB制限）
- リアルタイム同期なし（手動リフレッシュのみ）

**Backend**:
- メモリ制限（VPS: 1GB RAM）
- GitHub API レート制限（5000 req/hour）
- ジョブ永続化なし（メモリベース、再起動で消失）

---

## XI. 開発プロセスと学び

### 11.1 主要な技術的決定

**1. Context API → Zustand 移行**
- **理由**: パフォーマンス改善、型安全性向上
- **効果**: コード量40%削減、開発効率向上

**2. CodeMirror 6 → Novel (TipTap) 変更**
- **理由**: WYSIWYG エディター、リアルタイムプレビュー
- **効果**: ユーザー体験向上、実装の簡略化

**3. 同期処理の非同期化**
- **理由**: 大規模リポジトリの同期に時間がかかる
- **効果**: UI阻害なし、ユーザー体験向上

**4. V2リビルド決断**
- **理由**: 技術的負債の蓄積、モバイル対応の困難
- **効果**: クリーンなアーキテクチャ、長期的な保守性向上

### 11.2 課題と解決

**課題1: OAuth認証でリダイレクトループ**
- **原因**: Middleware が認証前にリダイレクト
- **解決**: `code` パラメータの存在チェックを追加

**課題2: GitHub API エラー（visibility + type 同時指定不可）**
- **原因**: GitHub API の仕様変更
- **解決**: `visibility` パラメータを削除

**課題3: セッション期限切れ（401エラー）**
- **原因**: 長時間のセッションでトークン期限切れ
- **解決**: API呼び出し前に自動セッション更新

**課題4: フォルダ名前変更時のパフォーマンス**
- **原因**: 配下の全ファイルを再帰的に処理
- **解決**: バッチ処理、エラーハンドリング強化（GitHub API Rate Limit対策）

### 11.3 開発上の教訓

**1. VPS設定**:
- クラウドプロバイダーのセキュリティグループを最初に確認
- cloud-initの設定ファイルが上書きする可能性を考慮
- SSH設定変更時は必ず1つのセッションを維持

**2. Supabase**:
- Redirect URLsリストの設定が認証の前提条件
- プレビューURLはワイルドカードで対応
- RLSポリシーは開発初期から設計

**3. GitHub API**:
- レート制限（5000 req/hour）を常に意識
- 大量のファイル操作はバッチ処理
- SHA管理で競合を防止

**4. UI/UX設計**:
- Atomic Designパターンで責務を明確に分離
- 再利用可能なコンポーネント設計
- 適切なコンポーネントサイズ（100-200行程度）で保守性向上

---

## XII. プロジェクト統計

### 12.1 開発期間

- **開始日**: 2025年9月21日（VPSセットアップ）
- **現在**: 2025年10月13日
- **経過**: 約23日
- **フェーズ**: 主要機能実装完了、継続的改善中

### 12.2 コードベース

**Frontend**:
```
frontend/src/
├── app/                    # Next.js App Router
│   ├── api/                # API Routes
│   ├── workspace/          # ワークスペースページ
│   ├── repository-setup/   # リポジトリ選択ページ
│   └── page.tsx            # ログインページ
├── components/             # UIコンポーネント（Atomic Design）
│   ├── atoms/              # 基本UI要素
│   ├── molecules/          # 複合コンポーネント
│   ├── organisms/          # 大規模機能コンポーネント
│   └── templates/          # ページテンプレート
├── hooks/                  # Custom hooks
├── stores/                 # Zustand stores
├── providers/              # Context providers
├── lib/                    # Utilities
├── types/                  # TypeScript types
├── utils/                  # Helper functions
└── data/                   # Static data
```

**Backend (VPS RAG)**:
```
backend/
├── api/
│   ├── main.py             # FastAPI app
│   ├── rag_system.py       # ChromaDB integration
│   └── routers/            # API routers
├── data/                   # ChromaDB data
└── docker-compose.prod.yml # Production config
```

### 12.3 主要技術

**Frontend**:
- Next.js 15.5.3, React 19.1.0, TypeScript 5.x
- Zustand 5.0.8, TanStack React Query 5.90.2
- Novel 1.0.2 (TipTap), Tailwind CSS 4.x
- Supabase 2.57.4, Octokit 22.0.0, Lucide React 0.544.0
- React Hook Form 7.63.0, Zod 4.1.11

**Backend**:
- FastAPI, ChromaDB, PyGithub
- Docker + Docker Compose, Nginx
- OpenAI Embeddings (Optional)

**Infrastructure**:
- Vercel (Frontend), ConoHa VPS (Backend)
- Supabase (Database, Auth), Cloudflare R2 (Optional)

---

## XIII. 今後のロードマップ

### 13.1 v1.0 (MVP) - 2025年2月末

- ✅ GitHub 認証・リポジトリ選択
- ✅ ファイル編集・自動保存・GitHub 同期
- ✅ 基本 RAG 機能（検索、同期）
- 🔄 ドラッグ&ドロップ
- 🔄 キーボードショートカット

### 13.2 v1.1 (RAG 強化) - 2025年3月末

- ⏳ RAG チャット機能の強化
- ⏳ AI アシスタント（コード補完）
- ⏳ セマンティック検索の精度向上
- ⏳ 引用機能の改善

### 13.3 v1.2 (高度機能) - 2025年4月末

- ⏳ ブランチ管理UI
- ⏳ Git履歴表示
- ⏳ リアルタイム協調編集
- ⏳ パフォーマンス最適化

### 13.4 v2.0 (長期) - 2025年6月以降

- ⏳ LangChain統合
- ⏳ マルチリポジトリサポート
- ⏳ プラグインシステム
- ⏳ モバイルアプリ

---

## XIV. 参考資料

### 14.1 関連ドキュメント

**認証・セットアップ**:
- [38_GITHUB_OAUTH_AUTHENTICATION.md](./38_GITHUB_OAUTH_AUTHENTICATION.md)
- [22_SUPABASE_DATA_MANAGEMENT.md](./22_SUPABASE_DATA_MANAGEMENT.md)
- [23_SUPABASE_SCHEMA_SETUP.md](./23_SUPABASE_SCHEMA_SETUP.md)

**機能実装**:
- [41_IMPLEMENTED_FEATURES_SUMMARY.md](./41_IMPLEMENTED_FEATURES_SUMMARY.md)
- [43_RAG_SEARCH_PANEL_IMPLEMENTATION.md](./43_RAG_SEARCH_PANEL_IMPLEMENTATION.md)
- [48_DRAG_DROP_IMPLEMENTATION_PLAN.md](./48_DRAG_DROP_IMPLEMENTATION_PLAN.md)

**アーキテクチャ**:
- [42_PROJECT_OVERVIEW.md](./42_PROJECT_OVERVIEW.md)
- [47_V2_REBUILD_PLAN.md](./47_V2_REBUILD_PLAN.md)
- [27_ZUSTAND_MIGRATION_AND_ENHANCEMENTS.md](./27_ZUSTAND_MIGRATION_AND_ENHANCEMENTS.md)

**バックエンド**:
- [11_VPS_SETUP_GUIDE.md](./11_VPS_SETUP_GUIDE.md)
- [04_VPS_RAG_IMPLEMENTATION.md](./04_VPS_RAG_IMPLEMENTATION.md)
- [08_VPS_RAG_TESTING_GUIDE.md](./08_VPS_RAG_TESTING_GUIDE.md)

### 14.2 外部リソース

- [Supabase Documentation](https://supabase.com/docs)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [@dnd-kit Documentation](https://docs.dndkit.com/)

---

## XV. まとめ

### 15.1 プロジェクトの達成

本プロジェクトは、約1ヶ月の開発期間で以下を達成しました:

✅ **完全機能のWebベースMarkdownエディター**
✅ **GitHub統合による双方向同期**
✅ **VPS上のRAG検索システム**
✅ **モダンなフロントエンドアーキテクチャ（V2リビルド）**
✅ **セキュアな認証・データ管理**

### 15.2 技術的ハイライト

- **アーキテクチャの進化**: Context API → Zustand、V1 → V2リビルド
- **非同期処理の最適化**: ジョブベースの同期システム
- **セキュリティ**: RLS、OAuth、セッション管理
- **ユーザー体験**: VSCode風UI、リアルタイムプレビュー、RAG検索

### 15.3 今後の展望

本プロジェクトは、継続的に進化する基盤を構築しました。モバイル対応、AIアシスタント、リアルタイム協調編集などの高度な機能を段階的に追加していきます。

**長期ビジョン**: 開発者・ライター・研究者のための最も使いやすいMarkdownエディタープラットフォーム

---

**ドキュメント作成日**: 2025年10月13日
**作成者**: Claude Code
**バージョン**: 1.0
**ライセンス**: MIT
