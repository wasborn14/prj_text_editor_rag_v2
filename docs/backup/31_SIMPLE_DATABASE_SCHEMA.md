# 31_SIMPLE_DATABASE_SCHEMA.md

## Overview

シンプルなSupabaseデータベース構造。ユーザー認証とリポジトリ管理のみに特化した最小構成。ファイル編集はGitHub API直接使用で、Supabaseはメタデータ管理のみ。

## Database Configuration

**Supabaseプロジェクト**: ymolsaawfqqsusohuyym.supabase.co
**作成日時**: 2025年9月27日
**対応フロントエンド**: Next.js 15.5.3 + TanStack Query + Zustand
**アーキテクチャ**: GitHub API直接使用（Supabaseは認証・設定管理のみ）

## アーキテクチャ設計

### データフロー
```
ユーザー認証: Supabase Auth
リポジトリ設定: Supabase Tables
ファイル読み書き: GitHub API直接
ファイル表示: GitHub Contents API
ファイル編集: GitHub API直接保存
```

### メリット
- **シンプル**: 同期処理なし
- **高速**: GitHub API直接アクセス
- **信頼性**: データの一貫性保証
- **保守性**: 複雑な同期ロジック排除

## Complete Database Schema

### 1. 既存データ削除（クリーンアップ）

```sql
-- 複雑な同期関連テーブルを完全削除
DROP TABLE IF EXISTS repository_files CASCADE;
DROP TABLE IF EXISTS sync_status CASCADE;
DROP VIEW IF EXISTS repository_sync_summary CASCADE;

-- 基本テーブルも一旦削除（再作成のため）
DROP TABLE IF EXISTS user_repositories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 関数・トリガー削除
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS select_repository(UUID) CASCADE;
```

### 2. 基本テーブル作成

```sql
-- updated_at 自動更新関数（再作成）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles テーブル（ユーザー情報）
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  github_username TEXT,
  github_id BIGINT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_repositories テーブル（リポジトリ設定）
CREATE TABLE user_repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  github_repo_id BIGINT NOT NULL,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  default_branch TEXT DEFAULT 'main',
  language TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, github_repo_id)
);
```

### 3. セキュリティ設定（RLS）

```sql
-- RLS (Row Level Security) 有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_repositories ENABLE ROW LEVEL SECURITY;

-- profiles のポリシー
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- user_repositories のポリシー
CREATE POLICY "Users can manage own repositories" ON user_repositories
  FOR ALL USING (auth.uid() = user_id);
```

### 4. パフォーマンス最適化

```sql
-- プライマリインデックス
CREATE INDEX idx_profiles_github_id ON profiles(github_id);
CREATE INDEX idx_profiles_username ON profiles(github_username);

-- リポジトリインデックス
CREATE INDEX idx_user_repositories_user_id ON user_repositories(user_id);
CREATE INDEX idx_user_repositories_selected ON user_repositories(user_id, is_selected)
  WHERE is_selected = true;
CREATE INDEX idx_user_repositories_github_id ON user_repositories(github_repo_id);
CREATE INDEX idx_user_repositories_accessed ON user_repositories(user_id, last_accessed_at);
```

### 5. 自動更新トリガー

```sql
-- updated_at 自動更新トリガー設定
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_repositories_updated_at
  BEFORE UPDATE ON user_repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 6. ユーティリティ関数

```sql
-- リポジトリ選択関数（1つのみ選択可能）
CREATE OR REPLACE FUNCTION select_repository(repo_id UUID)
RETURNS VOID AS $$
BEGIN
  -- 現在のユーザーの全リポジトリの選択を解除
  UPDATE user_repositories
  SET is_selected = FALSE, updated_at = NOW()
  WHERE user_id = auth.uid();

  -- 指定されたリポジトリを選択
  UPDATE user_repositories
  SET
    is_selected = TRUE,
    last_accessed_at = NOW(),
    updated_at = NOW()
  WHERE id = repo_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## API対応クエリ

### プロフィール管理

```sql
-- GET /api/profile
SELECT
  github_username,
  github_id,
  display_name,
  avatar_url,
  created_at,
  updated_at
FROM profiles
WHERE id = auth.uid();

-- PUT /api/profile (upsert)
INSERT INTO profiles (
  id, github_username, github_id, display_name, avatar_url
) VALUES (
  auth.uid(), $1, $2, $3, $4
) ON CONFLICT (id) DO UPDATE SET
  github_username = EXCLUDED.github_username,
  github_id = EXCLUDED.github_id,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW()
RETURNING *;
```

### リポジトリ管理

```sql
-- GET /api/repositories（全リポジトリ）
SELECT
  id,
  github_repo_id,
  owner,
  name,
  full_name,
  description,
  default_branch,
  language,
  is_selected,
  last_accessed_at,
  created_at,
  updated_at
FROM user_repositories
WHERE user_id = auth.uid()
ORDER BY
  is_selected DESC,
  last_accessed_at DESC,
  name ASC;

-- GET /api/repositories/selected（選択中リポジトリ）
SELECT *
FROM user_repositories
WHERE user_id = auth.uid()
  AND is_selected = true
LIMIT 1;

-- POST /api/repositories（新規追加）
INSERT INTO user_repositories (
  user_id, github_repo_id, owner, name, full_name,
  description, default_branch, language
) VALUES (
  auth.uid(), $1, $2, $3, $4, $5, $6, $7
) ON CONFLICT (user_id, github_repo_id) DO UPDATE SET
  owner = EXCLUDED.owner,
  name = EXCLUDED.name,
  full_name = EXCLUDED.full_name,
  description = EXCLUDED.description,
  default_branch = EXCLUDED.default_branch,
  language = EXCLUDED.language,
  updated_at = NOW()
RETURNING *;

-- POST /api/repositories/select（リポジトリ選択）
SELECT select_repository($1);
```

## データ検証クエリ

### 基本構造確認

```sql
-- テーブル存在確認
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'user_repositories');

-- カラム構造確認
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'user_repositories')
ORDER BY table_name, ordinal_position;
```

### インデックス確認

```sql
-- インデックス一覧
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_repositories')
ORDER BY tablename, indexname;
```

### セキュリティ確認

```sql
-- RLSポリシー確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_repositories');
```

## GitHub API統合

### ファイル操作設計

```typescript
// ファイル一覧取得
async function getRepositoryFiles(owner: string, repo: string) {
  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: '' // ルートディレクトリ
  })
  return response.data
}

// ファイル内容取得
async function getFileContent(owner: string, repo: string, path: string) {
  const response = await octokit.rest.repos.getContent({
    owner,
    repo,
    path
  })

  if (Array.isArray(response.data) || response.data.type !== 'file') {
    throw new Error('Not a file')
  }

  return {
    content: atob(response.data.content), // Base64デコード
    sha: response.data.sha
  }
}

// ファイル保存
async function saveFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha?: string
) {
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `Update ${path} via Web Editor`,
    content: btoa(content), // Base64エンコード
    sha // 既存ファイルの場合
  })
}
```

## サンプルデータ

### テストユーザー作成

```sql
-- プロフィール作成（認証後に実行）
INSERT INTO profiles (
  id,
  github_username,
  github_id,
  display_name,
  avatar_url
) VALUES (
  auth.uid(),
  'test_user',
  12345678,
  'Test User',
  'https://github.com/test_user.png'
) ON CONFLICT (id) DO UPDATE SET
  github_username = EXCLUDED.github_username,
  github_id = EXCLUDED.github_id,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();
```

### テストリポジトリ登録

```sql
-- サンプルリポジトリ
INSERT INTO user_repositories (
  user_id,
  github_repo_id,
  owner,
  name,
  full_name,
  description,
  default_branch,
  language,
  is_selected
) VALUES
  (
    auth.uid(),
    87654321,
    'test_user',
    'sample-project',
    'test_user/sample-project',
    'Next.js project for testing',
    'main',
    'TypeScript',
    true
  );
```

## メンテナンス

### データクリーンアップ

```sql
-- 長期間未使用リポジトリの削除（30日以上アクセスなし）
DELETE FROM user_repositories
WHERE user_id = auth.uid()
AND is_selected = false
AND last_accessed_at < NOW() - INTERVAL '30 days';
```

### 統計情報

```sql
-- ユーザー統計
SELECT
  p.github_username,
  p.display_name,
  COUNT(ur.id) as total_repositories,
  COUNT(CASE WHEN ur.is_selected THEN 1 END) as selected_repositories,
  MAX(ur.last_accessed_at) as last_repository_access
FROM profiles p
LEFT JOIN user_repositories ur ON p.id = ur.user_id
WHERE p.id = auth.uid()
GROUP BY p.id, p.github_username, p.display_name;
```

## 完全リセット（開発用）

```sql
-- 全データ削除
DELETE FROM user_repositories WHERE user_id = auth.uid();
DELETE FROM profiles WHERE id = auth.uid();
```

## Next Steps

この簡潔なスキーマにより以下が実現されます：

1. **高速な認証フロー** - 最小限のSupabaseテーブル
2. **直接的なファイル操作** - GitHub API経由
3. **シンプルな状態管理** - 複雑な同期なし
4. **保守しやすいコード** - 明確な責任分離

GitHub APIの制限に達した場合のみ、キャッシュ戦略を検討します。