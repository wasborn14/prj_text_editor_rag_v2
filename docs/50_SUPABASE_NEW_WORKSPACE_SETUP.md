# 新しいSupabaseワークスペース作成手順

## 目的

既存のSupabaseプロジェクトを変更せず、新しいワークスペースでGitHub Personal Access Token保存機能を実装する。

## 手順

### 1. Supabaseで新規プロジェクトを作成

1. https://supabase.com/dashboard にアクセス
2. **"New project"** をクリック
3. 以下を入力:
   - **Name**: `prj-text-editor-rag-v2` (任意の名前)
   - **Database Password**: 強力なパスワードを生成（保存必須）
   - **Region**: `Northeast Asia (Tokyo)` (ap-northeast-1)
   - **Pricing Plan**: `Free` (開発用)
4. **"Create new project"** をクリック
5. プロジェクトの作成完了を待つ（数分かかります）

### 2. プロジェクト情報を取得

プロジェクトが作成されたら、以下の情報をコピー:

**Settings** → **API** から:
- **Project URL**: `https://[your-project-ref].supabase.co`
- **anon public**: `eyJhbGci...` (Anon Key)
- **service_role**: `eyJhbGci...` (Service Role Key - 後で使用)

### 3. データベーステーブルを作成

**SQL Editor** → **New query** で以下を実行:

```sql
-- ユーザープロファイルテーブル（既存機能用）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  github_username TEXT,
  github_id INTEGER,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GitHub Personal Access Tokenを保存するテーブル
CREATE TABLE user_github_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  github_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,  -- トークンの有効期限（ユーザーが入力）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Row Level Security (RLS)を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_github_tokens ENABLE ROW LEVEL SECURITY;

-- プロファイルのポリシー
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- GitHubトークンのポリシー
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

-- 有効期限が近いトークンを確認するためのビュー
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

-- ユーザーは自分の有効期限情報のみ閲覧可能
GRANT SELECT ON expiring_tokens TO authenticated;
```

### 4. GitHub OAuth Providerを設定

**Authentication** → **Providers** → **GitHub**:

1. **Enable** をONにする
2. **Client ID**: 既存のGitHub AppのClient ID
   - または新しいGitHub Appを作成（推奨）
3. **Client Secret**: GitHub AppのClient Secret
4. **Redirect URL**: 表示されているURLをコピー
   - 例: `https://[your-project-ref].supabase.co/auth/v1/callback`
5. **Save** をクリック

### 5. GitHub App設定を更新（新しいCallback URLを追加）

https://github.com/settings/apps にアクセス:

1. 使用するGitHub Appを選択
2. **Callback URL** を編集:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
3. **Save changes** をクリック

### 6. 環境変数を更新

`frontend/.env.local` を編集:

```bash
# 既存の設定をコメントアウト
# NEXT_PUBLIC_SUPABASE_URL=https://ymolsaawfqqsusohuyym.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# 新しいSupabaseプロジェクトの設定
NEXT_PUBLIC_SUPABASE_URL=https://[your-new-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-new-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-new-service-role-key]

# GitHub OAuth (既存のものを使用)
NEXT_PUBLIC_GITHUB_CLIENT_ID=Ov23li0Au4cZHwM6u01l
GITHUB_CLIENT_SECRET=2afbd90427843eb0f3c90d63197341942dadb1c9

# GitHub Personal Access Token（開発用・後で削除予定）
NEXT_PUBLIC_GITHUB_PERSONAL_TOKEN=ghp_your_token_here
```

### 7. 動作確認

```bash
cd frontend
npm run dev
```

1. http://localhost:3000 にアクセス
2. GitHubでログイン
3. コンソールで以下を確認:
   ```
   🔍 Initialize - Session info:
      Has session: true
      User: your@email.com
   ```
4. ログインが成功したらOK

### 8. データベースの確認

Supabase Dashboard → **Table Editor**:

- **auth.users**: ログインしたユーザーが追加されている
- **profiles**: 空（後で自動作成される）
- **user_github_tokens**: 空（次のステップで実装）

## 次のステップ

新しいSupabaseプロジェクトが準備できたら、以下を実装します:

1. **設定ページの作成** (`/settings`)
2. **GitHub Personal Access Token入力フォーム**
3. **トークン保存API** (`/api/github-token`)
4. **authStoreの更新** (DBからトークンを取得)

## トラブルシューティング

### プロジェクト作成が失敗する
- 無料枠の制限（2プロジェクトまで）に達している可能性
- 既存の未使用プロジェクトを削除してから再試行

### GitHub OAuth認証が失敗する
- Callback URLが正しく設定されているか確認
- GitHub AppのClient IDとClient Secretが正しいか確認
- ブラウザのキャッシュをクリア

### データベース接続エラー
- `.env.local`のURLとキーが正しいか確認
- 開発サーバーを再起動

## 参考

- 既存のSupabaseプロジェクト: `ymolsaawfqqsusohuyym`
- 新しいプロジェクト: `[your-new-project-ref]`
- 古いプロジェクトは削除せず、並行して使用可能
