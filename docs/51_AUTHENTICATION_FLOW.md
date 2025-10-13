# 認証フローとトークン管理の仕組み

## 概要

このアプリケーションは、Supabase AuthとGitHub OAuthを使用した認証システムを実装しています。GitHub Personal Access Tokenをデータベースに保存し、GitHubリポジトリへのアクセスを管理します。

## アーキテクチャ

### 認証の2層構造

1. **Supabase認証** - ユーザーログイン管理
   - GitHub OAuthによる認証
   - セッション管理（60分間有効、自動リフレッシュ）
   - Cookie-basedセッション

2. **GitHub Personal Access Token** - リポジトリアクセス
   - データベースに保存
   - ユーザーが手動で入力・管理
   - 長期間有効（数ヶ月〜1年）

## データベーススキーマ

### 1. auth.users（Supabase組み込み）

```sql
-- Supabaseが自動管理
auth.users {
  id: UUID (Primary Key)
  email: TEXT
  user_metadata: JSONB  -- GitHubプロフィール情報が含まれる
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

**user_metadataに含まれる情報:**
- `user_name`: GitHubユーザー名
- `avatar_url`: アバター画像URL
- `full_name`: フルネーム
- `provider_id`: GitHub ID

### 2. profiles（カスタムテーブル）

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT,
  github_id INTEGER,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

**用途:**
- GitHubプロフィール情報の永続化
- ダッシュボードでのユーザー情報表示
- 初回ログイン時に自動保存（upsert）

### 3. user_github_tokens（カスタムテーブル）

```sql
CREATE TABLE user_github_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  github_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,  -- ユーザーが入力した有効期限
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Row Level Security
ALTER TABLE user_github_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tokens"
  ON user_github_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON user_github_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON user_github_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON user_github_tokens FOR DELETE
  USING (auth.uid() = user_id);
```

**用途:**
- GitHub Personal Access Tokenの保存
- トークン有効期限の管理
- GitHubリポジトリへのアクセスに使用

### 4. expiring_tokens（ビュー）

```sql
CREATE OR REPLACE VIEW expiring_tokens AS
SELECT
  user_id,
  github_token,
  expires_at,
  created_at,
  updated_at,
  CASE
    WHEN expires_at IS NULL THEN 'never'
    WHEN expires_at < NOW() THEN 'expired'
    WHEN expires_at < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'valid'
  END AS status,
  CASE
    WHEN expires_at IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (expires_at - NOW()))::INTEGER
  END AS days_remaining
FROM user_github_tokens;

GRANT SELECT ON expiring_tokens TO authenticated;
```

**用途:**
- トークン有効期限の状態確認
- 期限切れ警告の表示

## 認証フロー

### 1. 初回ログイン

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Supabase
    participant GitHub
    participant DB

    User->>App: 「GitHubでログイン」クリック
    App->>Supabase: signInWithOAuth()
    Supabase->>GitHub: OAuth認証リクエスト
    GitHub->>User: 認証画面表示
    User->>GitHub: 認証許可
    GitHub->>Supabase: 認証コード返却
    Supabase->>GitHub: トークン取得
    Supabase->>App: リダイレクト（/dashboard）
    App->>Supabase: getSession()
    Supabase->>App: session, user

    Note over App: SIGNED_IN イベント発火

    App->>App: saveProfile()
    App->>DB: プロフィール保存（upsert）

    App->>DB: トークン取得試行
    DB->>App: トークンなし

    App->>User: トークン設定モーダル表示
    User->>App: GitHub Personal Access Token入力
    App->>DB: トークン保存
    App->>User: ダッシュボード表示
```

### 2. 2回目以降のログイン

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Supabase
    participant DB

    User->>App: アプリアクセス
    App->>Supabase: getSession()
    Supabase->>App: session, user

    App->>DB: fetchGithubToken()
    DB->>App: トークン返却

    App->>DB: プロフィール保存（upsert）
    Note over App,DB: 既存の場合は更新

    App->>User: ダッシュボード表示（トークン設定済み）
```

## API Routes

### 1. POST /api/profile

**機能**: GitHubプロフィール情報を保存

**リクエスト:**
```json
{
  "github_username": "wasborn14",
  "github_id": 12345678,
  "display_name": "Wasborn",
  "avatar_url": "https://avatars.githubusercontent.com/u/12345678"
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Profile saved successfully"
}
```

**認証**: Supabaseセッション必須

**実装場所**: `frontend/src/app/api/profile/route.ts`

### 2. GET /api/profile

**機能**: プロフィール情報を取得

**レスポンス:**
```json
{
  "hasProfile": true,
  "profile": {
    "id": "753c7949-f473-4e32-878e-c33d5c33cde8",
    "github_username": "wasborn14",
    "github_id": 12345678,
    "display_name": "Wasborn",
    "avatar_url": "https://avatars.githubusercontent.com/u/12345678",
    "created_at": "2025-10-13T03:00:00Z",
    "updated_at": "2025-10-13T03:00:00Z"
  }
}
```

**認証**: Supabaseセッション必須

### 3. POST /api/github-token

**機能**: GitHub Personal Access Tokenを保存

**リクエスト:**
```json
{
  "token": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "expiresAt": "2026-01-11"  // 任意
}
```

**レスポンス:**
```json
{
  "success": true,
  "message": "Token saved successfully"
}
```

**認証**: Supabaseセッション必須

**実装場所**: `frontend/src/app/api/github-token/route.ts`

### 4. GET /api/github-token

**機能**: 保存されたトークンを取得

**レスポンス:**
```json
{
  "hasToken": true,
  "token": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "expiresAt": "2026-01-11T00:00:00Z",
  "createdAt": "2025-10-13T03:00:00Z",
  "updatedAt": "2025-10-13T03:00:00Z"
}
```

**認証**: Supabaseセッション必須

### 5. DELETE /api/github-token

**機能**: トークンを削除

**レスポンス:**
```json
{
  "success": true,
  "message": "Token deleted successfully"
}
```

**認証**: Supabaseセッション必須

## クライアントサイド実装

### authStore (Zustand)

**ファイル**: `frontend/src/stores/authStore.ts`

**主要機能:**

#### 1. initialize()

```typescript
// アプリ起動時に実行
initialize: async () => {
  // セッション取得
  const { session } = await supabase.auth.getSession()

  // トークン取得
  const githubToken = await fetchGithubToken()

  // 状態を設定
  set({ session, user, githubToken })

  // 自動リフレッシュ開始
  startSessionRefresh()
}
```

#### 2. saveProfile()

```typescript
// ログイン時に自動実行
saveProfile: async () => {
  const { user } = get()

  // user_metadataから情報抽出
  const github_username = user.user_metadata?.user_name
  const github_id = user.user_metadata?.provider_id
  const display_name = user.user_metadata?.full_name
  const avatar_url = user.user_metadata?.avatar_url

  // API経由で保存
  await fetch('/api/profile', {
    method: 'POST',
    body: JSON.stringify({ github_username, github_id, display_name, avatar_url })
  })
}
```

#### 3. saveGithubToken()

```typescript
// トークン設定モーダルから呼ばれる
saveGithubToken: async (token: string, expiresAt: string | null) => {
  await fetch('/api/github-token', {
    method: 'POST',
    body: JSON.stringify({ token, expiresAt })
  })

  set({ githubToken: token })
}
```

#### 4. fetchGithubToken()

```typescript
// 初期化時とログイン時に実行
fetchGithubToken: async () => {
  const response = await fetch('/api/github-token')
  const data = await response.json()
  return data.hasToken ? data.token : null
}
```

#### 5. startSessionRefresh()

```typescript
// セッション自動リフレッシュ（10秒ごとにチェック）
startSessionRefresh: () => {
  const intervalId = setInterval(async () => {
    const { session } = await supabase.auth.getSession()

    // 期限切れまたは5分以内の場合、リフレッシュ
    if (remainingMs <= 5 * 60 * 1000) {
      await supabase.auth.refreshSession()
    }
  }, 10 * 1000)
}
```

### onAuthStateChange イベントハンドリング

```typescript
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth state changed:', event)

  // トークン取得
  let githubToken = null
  if (session?.user) {
    githubToken = await fetchGithubToken()
  }

  set({ session, user: session?.user, githubToken })

  if (event === 'SIGNED_IN' && session?.user) {
    // プロフィール自動保存
    await saveProfile()

    // 自動リフレッシュ開始
    startSessionRefresh()
  } else if (event === 'SIGNED_OUT') {
    // クリーンアップ
    stopSessionRefresh()
  }
})
```

## UI コンポーネント

### TokenSetupModal

**ファイル**: `frontend/src/components/TokenSetupModal.tsx`

**表示条件:**
- 初回ログイン時（`githubToken === null`）
- ダッシュボード読み込み時にトークンが未設定の場合

**機能:**
- GitHub Personal Access Token入力
- 有効期限入力（任意）
- トークン作成ガイド表示
- 「後で設定」オプション

**実装:**
```typescript
export default function TokenSetupModal({
  isOpen,
  onClose,
  onSave,
}: TokenSetupModalProps) {
  const [token, setToken] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const handleSave = async () => {
    await onSave(token, expiresAt || null)
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* モーダルUI */}
    </div>
  )
}
```

### Dashboard

**ファイル**: `frontend/src/app/dashboard/page.tsx`

**トークンチェック:**
```typescript
useEffect(() => {
  if (user && !loading && !githubToken) {
    setShowTokenSetup(true)
  }
}, [user, loading, githubToken])
```

**トークン保存後の処理:**
```typescript
const handleSaveToken = async (token: string, expiresAt: string | null) => {
  await saveGithubToken(token, expiresAt)
  setShowTokenSetup(false)
  setRepoLoading(true)  // リポジトリ再取得
}
```

## セキュリティ考慮事項

### 1. Row Level Security (RLS)

すべてのカスタムテーブルでRLSを有効化:

```sql
-- ユーザーは自分のデータのみアクセス可能
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id)
```

### 2. Server-side API Routes

- すべてのAPI RouteでSupabaseセッション認証
- `createServerClient`を使用（Cookie-based認証）
- 認証失敗時は401 Unauthorizedを返却

```typescript
const { data: { session } } = await supabase.auth.getSession()

if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 3. トークンの保護

- トークンはテーブルに平文保存（Supabase側でRLS保護）
- API経由でのみアクセス可能
- クライアント側では必要最小限の期間のみメモリ保持

### 4. HTTPS通信

- 本番環境では必ずHTTPS使用
- Supabase通信は常に暗号化

## トラブルシューティング

### トークンが保存されない

**確認項目:**
1. Supabaseセッションが有効か
2. `user_github_tokens`テーブルが作成されているか
3. RLSポリシーが正しく設定されているか
4. ブラウザコンソールでエラーを確認

**解決方法:**
```bash
# Supabase SQL Editorで確認
SELECT * FROM user_github_tokens WHERE user_id = auth.uid();
```

### プロフィールが保存されない

**確認項目:**
1. `user_metadata`にGitHub情報が含まれているか
2. `profiles`テーブルが作成されているか
3. API Routeのログを確認

**デバッグ:**
```typescript
// ブラウザコンソールで確認
console.log('User metadata:', user.user_metadata)
```

### セッションが頻繁に切れる

**原因:**
- Supabaseセッションの有効期限切れ（60分）
- 自動リフレッシュが動作していない

**解決方法:**
```typescript
// authStore.tsで確認
console.log('Refresh interval active:', !!refreshIntervalId)
```

## 環境変数

### 必須環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # 使用していないが念のため

# GitHub OAuth
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv23li...
GITHUB_CLIENT_SECRET=962f7c...
```

## まとめ

### 認証の流れ

1. **ログイン**: GitHub OAuth → Supabase認証
2. **プロフィール保存**: 自動（SIGNED_INイベント）
3. **トークン設定**: ユーザー入力（初回ログイン時）
4. **セッション管理**: 自動リフレッシュ（60分ごと）
5. **GitHub API**: 保存したPersonal Access Token使用

### データの流れ

```
GitHub OAuth → Supabase Auth → auth.users
                ↓
        user_metadata抽出
                ↓
           profiles保存

ユーザー入力 → user_github_tokens保存
                ↓
        GitHub API呼び出し
```

### ベストプラクティス

1. トークンは必ずServer-side APIで管理
2. RLSを必ず有効化
3. セッションの自動リフレッシュを実装
4. エラーハンドリングを適切に実装
5. トークン有効期限の通知機能を実装（将来）

## 参考資料

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
