# 認証システム設計書

## 概要

本プロジェクトの認証システムは、Supabase AuthとGitHub OAuthを組み合わせたSSR対応の認証フローを実装しています。

## アーキテクチャ

### 認証フロー

```
1. ユーザーがログインボタンをクリック
   ↓
2. GitHub OAuth認証画面へリダイレクト
   ↓
3. GitHub認証成功後、Supabaseがセッションを作成
   ↓
4. ダッシュボードへリダイレクト
   ↓
5. GitHubトークン設定モーダルが表示
   ↓
6. Personal Access Tokenを入力・保存
   ↓
7. リポジトリ選択・編集可能
```

## 主要コンポーネント

### 1. Supabase認証

**場所**: `frontend/src/lib/supabase.ts`

```typescript
// クライアント側のSupabaseクライアント
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**特徴**:
- Cookie-based認証
- SSR対応
- JWT自動更新

### 2. 認証状態管理 (Zustand)

**場所**: `frontend/src/stores/authStore.ts`

```typescript
interface AuthState {
  user: User | null
  loading: boolean
  githubToken: string | null
  needsTokenSetup: boolean
  tokenSetupReason: string | null

  // Actions
  initialize: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  checkGitHubToken: () => Promise<void>
}
```

**主要機能**:
- ユーザー情報の保持
- GitHubトークン状態の管理
- トークン検証・期限チェック
- GitHub OAuth with `prompt: 'select_account'`

### 3. 認証初期化プロバイダー

**場所**: `frontend/src/providers/AuthInitializer.tsx`

```typescript
export function AuthInitializer({ children }: AuthInitializerProps) {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return <>{children}</>
}
```

**役割**:
- アプリ起動時に認証状態を初期化
- Supabaseセッションのリストア
- 認証状態の監視

### 4. ミドルウェア

**場所**: `frontend/src/middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()

  // 未認証ユーザーを/loginへリダイレクト
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 認証済みユーザーを/dashboardへリダイレクト
  if (user && isAuthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
}
```

**保護されるルート**:
- `/dashboard`
- `/api/*` (一部除く)

**公開ルート**:
- `/`
- `/login`

### 5. カスタムフック

#### useRequireAuth

**場所**: `frontend/src/hooks/useRequireAuth.ts`

```typescript
export function useRequireAuth(redirectTo: string = '/login') {
  const router = useRouter()
  const { user, loading } = useAuthStore()

  useEffect(() => {
    if (!loading && !user) {
      router.replace(redirectTo)
    }
  }, [user, loading, redirectTo, router])

  return { loading, isAuthenticated: !!user }
}
```

**用途**: 認証が必要なページでの使用

#### useRedirectIfAuthenticated

**場所**: `frontend/src/hooks/useRedirectIfAuthenticated.ts`

```typescript
export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const router = useRouter()
  const { user, loading } = useAuthStore()

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo)
    }
  }, [user, loading, redirectTo, router])

  return { loading }
}
```

**用途**: ログインページなど、認証済みユーザーがアクセスすべきでないページ

## GitHubトークン管理

### データベーステーブル

**テーブル名**: `user_github_tokens`

```sql
CREATE TABLE user_github_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### API Routes

#### GET /api/github-token

**機能**: 有効なGitHubトークンを取得

**レスポンス**:
```json
{
  "hasToken": true,
  "token": "ghp_...",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

#### POST /api/github-token

**機能**: GitHubトークンを保存・更新

**リクエスト**:
```json
{
  "token": "ghp_...",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**検証フロー**:
1. GitHub APIでトークン検証 (`GET https://api.github.com/user`)
2. 有効な場合のみデータベースに保存
3. 既存トークンがあればupsert

### GitHubトークンモーダル

**場所**: `frontend/src/components/features/settings/GitHubTokenModal.tsx`

**表示条件**:
- トークンが未設定 (`needsTokenSetup === true`)
- トークンの期限切れ (`tokenSetupReason === 'expired'`)
- トークンが無効 (`tokenSetupReason === 'invalid'`)

**機能**:
- トークン入力フォーム
- 期限設定（オプション）
- トークン検証
- ログアウトボタン

**特徴**:
- モーダルを閉じられない（dismissible: false）
- トークン保存またはログアウトのみ選択可能

## リポジトリ選択の永続化

### データベーステーブル

**テーブル名**: `selected_repository`

```sql
CREATE TABLE selected_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_id INTEGER NOT NULL,
  repository_full_name TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  repository_owner TEXT NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### API Routes

#### GET /api/selected-repository

**機能**: 選択済みリポジトリを取得

#### POST /api/selected-repository

**機能**: リポジトリ選択を保存（upsert）

#### DELETE /api/selected-repository

**機能**: リポジトリ選択を削除

### カスタムフック

**場所**: `frontend/src/hooks/useSelectedRepository.ts`

```typescript
export function useSelectedRepository() {
  return {
    selectedRepository: data,
    saveSelectedRepository: mutateAsync,
    deleteSelectedRepository: mutateAsync,
    isLoading,
    isSaving,
    isDeleting,
  }
}
```

**統合**: TanStack Queryでキャッシング・自動再取得

## セキュリティ

### Row Level Security (RLS)

全てのテーブルでRLSを有効化:

```sql
-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view their own data"
  ON table_name FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data"
  ON table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data"
  ON table_name FOR UPDATE
  USING (auth.uid() = user_id);
```

### トークン検証

**GitHubトークン**:
- GitHub APIで検証後に保存
- 期限チェック (expires_at)
- 無効なトークンは拒否

**セッショントークン**:
- Supabaseが自動管理
- JWT自動更新
- HttpOnly Cookie

### API認証

全てのAPI Routeで認証チェック:

```typescript
const supabase = await getSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
}
```

## 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# GitHub OAuth (Supabase Authで設定)
# - Client ID
# - Client Secret
# - Redirect URLs: http://localhost:3000/**, https://your-app.vercel.app/**
# - Callback URL: https://xxx.supabase.co/auth/v1/callback
```

## GitHub OAuth設定

### Supabase側

1. Authentication > Providers > GitHub を有効化
2. Client ID / Client Secret を設定
3. Redirect URLs を追加:
   - Development: `http://localhost:3000/**`
   - Production: `https://your-app.vercel.app/**`

### GitHub側

1. Settings > Developer settings > OAuth Apps
2. New OAuth App を作成
3. 設定:
   - Application name: `Your App Name`
   - Homepage URL: `https://your-app.vercel.app`
   - Callback URL: `https://xxx.supabase.co/auth/v1/callback`

### Personal Access Token (PAT)

**必要なスコープ**:
- `repo` - リポジトリへのフルアクセス
- `read:user` - ユーザー情報の読み取り
- `user:email` - メールアドレスの読み取り

**生成方法**:
1. GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate new token (classic)
3. 必要なスコープを選択
4. Expiration を設定（推奨: 90 days）
5. Generate token

## データフロー

### 初回ログイン

```
1. ユーザー: ログインボタンクリック
   ↓
2. authStore.signInWithGitHub()
   ↓
3. GitHub OAuth画面表示
   ↓
4. GitHub: ユーザー認証
   ↓
5. Supabase: セッション作成
   ↓
6. リダイレクト: /dashboard
   ↓
7. useRequireAuth: 認証確認
   ↓
8. authStore.checkGitHubToken()
   ↓
9. API: GET /api/github-token (トークンなし)
   ↓
10. GitHubTokenModal表示
    ↓
11. ユーザー: PATを入力
    ↓
12. API: POST /api/github-token (検証・保存)
    ↓
13. authStore: githubToken更新
    ↓
14. リポジトリ一覧を取得・表示
```

### 再訪問時

```
1. ページロード
   ↓
2. AuthInitializer: authStore.initialize()
   ↓
3. Supabase: セッション復元
   ↓
4. authStore.checkGitHubToken()
   ↓
5. API: GET /api/github-token
   ↓
6. トークン有効: ダッシュボード表示
   トークン期限切れ: モーダル表示
```

## トラブルシューティング

### トークンが保存されない

**原因**: GitHub APIでの検証失敗

**解決策**:
1. トークンのスコープを確認
2. トークンが有効か確認
3. GitHub APIのレート制限を確認

### ログイン後にリダイレクトループ

**原因**: ミドルウェアとフックの競合

**解決策**:
1. middleware.tsのロジック確認
2. useRequireAuthの条件確認
3. Cookieの保存状態確認

### セッションが保持されない

**原因**: Cookie設定の問題

**解決策**:
1. SameSite属性を確認
2. HTTPS環境でSecure属性を確認
3. ドメイン設定を確認

## テスト

### トークン期限切れのテスト

```sql
-- トークンを期限切れに設定
UPDATE user_github_tokens
SET expires_at = NOW() - INTERVAL '1 day'
WHERE user_id = 'your-user-id';
```

### 認証フローのテスト

1. ログアウト状態で `/dashboard` にアクセス → `/login` にリダイレクト
2. ログインボタンクリック → GitHub OAuth画面表示
3. 認証完了 → `/dashboard` にリダイレクト
4. トークン未設定 → モーダル表示
5. トークン入力・保存 → ダッシュボード利用可能

## 今後の拡張

### 実装予定

- [ ] 2FA (Two-Factor Authentication)
- [ ] セッション管理画面
- [ ] トークンの自動更新
- [ ] ログイン履歴
- [ ] アカウント削除機能

### 検討中

- [ ] 複数のGitHubアカウント対応
- [ ] GitHub Appへの移行（PATの代替）
- [ ] OAuth Scopeの動的設定
- [ ] トークンの暗号化保存

## 参考リンク

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [GitHub OAuth Apps](https://docs.github.com/en/apps/oauth-apps)
- [GitHub Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
