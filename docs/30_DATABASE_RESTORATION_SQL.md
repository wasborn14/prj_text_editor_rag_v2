# 30_DATABASE_RESTORATION_SQL.md

## Overview

現在のプロジェクト状態（2025年1月24日時点）に戻すための完全なSupabaseデータベース復元SQLスクリプト。ワークスペース機能とディレクトリ表示機能が実装された状態への復元手順。

## Database Configuration

**Supabaseプロジェクト**: ymolsaawfqqsusohuyym.supabase.co
**実行日時**: 2025年1月24日
**対応フロントエンド**: Next.js 15.5.3 + TanStack Query + Zustand

## Complete Database Restoration Script

### 1. テーブル削除（既存データクリア）

```sql
-- 既存テーブルとポリシーを完全削除
DROP TABLE IF EXISTS user_repositories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- トリガー関数削除
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

### 2. 基本テーブル構造作成

```sql
-- profiles テーブル作成
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  github_username TEXT,
  github_id BIGINT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_repositories テーブル作成
CREATE TABLE user_repositories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
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

-- profiles のポリシー作成
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- user_repositories のポリシー作成
CREATE POLICY "Users can manage own repositories" ON user_repositories
  FOR ALL USING (auth.uid() = user_id);
```

### 4. パフォーマンス最適化

```sql
-- インデックス作成（パフォーマンス向上）
CREATE INDEX idx_profiles_github_id ON profiles(github_id);
CREATE INDEX idx_user_repositories_user_id ON user_repositories(user_id);
CREATE INDEX idx_user_repositories_selected ON user_repositories(user_id, is_selected) WHERE is_selected = true;
CREATE INDEX idx_user_repositories_github_id ON user_repositories(github_repo_id);
```

### 5. 自動更新システム

```sql
-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at トリガー設定
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_repositories_updated_at
  BEFORE UPDATE ON user_repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Data Verification Queries

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
-- インデックス確認
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

### セキュリティポリシー確認

```sql
-- RLSポリシー確認
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_repositories');
```

## Sample Data for Testing

### テストユーザーの作成

```sql
-- プロフィール作成テスト（認証後に実行）
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

### テストリポジトリの登録

```sql
-- サンプルリポジトリ登録
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
    'sample-frontend',
    'test_user/sample-frontend',
    'Next.js + TanStack Query project',
    'main',
    'TypeScript',
    true
  ),
  (
    auth.uid(),
    87654322,
    'test_user',
    'sample-backend',
    'test_user/sample-backend',
    'FastAPI + Python project',
    'main',
    'Python',
    false
  )
ON CONFLICT (user_id, github_repo_id) DO UPDATE SET
  owner = EXCLUDED.owner,
  name = EXCLUDED.name,
  full_name = EXCLUDED.full_name,
  description = EXCLUDED.description,
  default_branch = EXCLUDED.default_branch,
  language = EXCLUDED.language,
  updated_at = NOW();
```

## Current State Verification

### ワークスペース機能対応確認

```sql
-- 選択中リポジトリの確認（workspace表示用）
SELECT
  ur.id,
  ur.full_name,
  ur.description,
  ur.default_branch,
  ur.language,
  ur.last_accessed_at
FROM user_repositories ur
JOIN profiles p ON ur.user_id = p.id
WHERE ur.user_id = auth.uid()
AND ur.is_selected = true;
```

### GitHub統合データ確認

```sql
-- GitHub統合に必要なデータ確認
SELECT
  p.github_username,
  p.github_id,
  ur.github_repo_id,
  ur.owner,
  ur.name,
  ur.full_name,
  ur.default_branch
FROM profiles p
JOIN user_repositories ur ON p.id = ur.user_id
WHERE p.id = auth.uid();
```

## Maintenance Queries

### データクリーンアップ

```sql
-- 非選択リポジトリの古いデータ削除（30日以上アクセスなし）
DELETE FROM user_repositories
WHERE user_id = auth.uid()
AND is_selected = false
AND last_accessed_at < NOW() - INTERVAL '30 days';
```

### リポジトリ選択状態更新

```sql
-- リポジトリ選択変更（他を非選択にして指定を選択）
WITH repository_update AS (
  UPDATE user_repositories
  SET is_selected = false, updated_at = NOW()
  WHERE user_id = auth.uid() AND is_selected = true
  RETURNING user_id
)
UPDATE user_repositories
SET
  is_selected = true,
  last_accessed_at = NOW(),
  updated_at = NOW()
WHERE user_id = auth.uid()
AND id = $1; -- 選択するリポジトリID
```

### 統計情報取得

```sql
-- ユーザー統計情報
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

## API Integration Points

### プロフィール関連

```sql
-- API /api/profile GET 対応
SELECT
  github_username,
  github_id,
  display_name,
  avatar_url,
  created_at,
  updated_at
FROM profiles
WHERE id = auth.uid();

-- API /api/profile PUT 対応（upsert）
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

### リポジトリ関連

```sql
-- API /api/repositories GET 対応
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

-- API /api/repositories/selected GET 対応
SELECT
  ur.*,
  jsonb_build_object(
    'id', ur.id,
    'github_repo_id', ur.github_repo_id,
    'owner', ur.owner,
    'name', ur.name,
    'full_name', ur.full_name,
    'description', ur.description,
    'default_branch', ur.default_branch,
    'language', ur.language,
    'last_accessed_at', ur.last_accessed_at
  ) as selected_repository
FROM user_repositories ur
WHERE ur.user_id = auth.uid() AND ur.is_selected = true
LIMIT 1;
```

## Backup and Recovery

### データバックアップ

```sql
-- プロフィールデータのバックアップ
COPY (
  SELECT * FROM profiles
  WHERE id = auth.uid()
) TO '/tmp/profiles_backup.csv' WITH CSV HEADER;

-- リポジトリデータのバックアップ
COPY (
  SELECT * FROM user_repositories
  WHERE user_id = auth.uid()
) TO '/tmp/repositories_backup.csv' WITH CSV HEADER;
```

### 完全リストア（緊急時用）

```sql
-- 完全データベース再構築
BEGIN;

-- 既存データ削除
DELETE FROM user_repositories WHERE user_id = auth.uid();
DELETE FROM profiles WHERE id = auth.uid();

-- バックアップからリストア
-- （実際のデータはCSVファイルから適切にインポート）

COMMIT;
```

## Troubleshooting

### よくある問題と解決方法

#### 1. 認証エラー
```sql
-- auth.uid() が null の場合の確認
SELECT auth.uid(), auth.role();

-- セッション情報確認
SELECT * FROM auth.users WHERE id = auth.uid();
```

#### 2. RLS権限エラー
```sql
-- ポリシー確認と再作成
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- 必要に応じてポリシー再作成
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);
```

#### 3. 重複キーエラー
```sql
-- 既存データ確認
SELECT github_repo_id, COUNT(*)
FROM user_repositories
WHERE user_id = auth.uid()
GROUP BY github_repo_id
HAVING COUNT(*) > 1;

-- 重複削除（最新のみ保持）
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY user_id, github_repo_id
    ORDER BY updated_at DESC
  ) as rn
  FROM user_repositories
  WHERE user_id = auth.uid()
)
DELETE FROM user_repositories
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

## Next Steps

復元後の確認事項:

1. **フロントエンド接続テスト**
   ```bash
   # 開発サーバー起動
   npm run dev

   # ワークスペースページアクセス
   # http://localhost:3000/workspace
   ```

2. **API動作確認**
   ```bash
   # プロフィールAPI確認
   curl -H "Authorization: Bearer [token]" \
     http://localhost:3000/api/profile

   # リポジトリAPI確認
   curl -H "Authorization: Bearer [token]" \
     http://localhost:3000/api/repositories/selected
   ```

3. **機能テスト**
   - GitHub認証フロー
   - リポジトリ選択
   - ディレクトリ構造表示
   - ワークスペース表示

この復元スクリプトにより、現在のプロジェクト状態に完全に戻すことができます。