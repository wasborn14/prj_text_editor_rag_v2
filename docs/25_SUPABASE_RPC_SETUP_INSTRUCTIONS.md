# Supabase RPC Functions Setup Instructions

## Overview

このドキュメントでは、リポジトリ管理システムに必要なSupabase RPC関数の設定手順を説明します。

## 前提条件

- Supabaseプロジェクトが作成済み
- `user_repositories`テーブルが作成済み（スキーマは`docs/23_SUPABASE_SCHEMA_SETUP.md`参照）
- Supabase Dashboard SQLエディタへのアクセス権限

## RPC関数の実行手順

### 1. Supabase Dashboardにアクセス

1. [Supabase Dashboard](https://supabase.com/dashboard)にログイン
2. 対象プロジェクトを選択
3. 左サイドバーから「SQL Editor」を選択

### 2. RPC関数の作成

以下のSQL文を順番に実行してください：

#### 2.1 リポジトリ選択関数

```sql
-- リポジトリ選択用のRPC関数
-- 指定されたリポジトリを選択し、他のリポジトリの選択を解除する
CREATE OR REPLACE FUNCTION select_repository(
  p_user_id UUID,
  p_repository_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 指定されたリポジトリが存在し、ユーザーが所有しているかチェック
  IF NOT EXISTS (
    SELECT 1 FROM user_repositories
    WHERE id = p_repository_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Repository not found or access denied';
  END IF;

  -- 現在の選択をすべて解除
  UPDATE user_repositories
  SET is_selected = false
  WHERE user_id = p_user_id AND is_selected = true;

  -- 指定されたリポジトリを選択
  UPDATE user_repositories
  SET
    is_selected = true,
    last_accessed_at = NOW()
  WHERE id = p_repository_id AND user_id = p_user_id;
END;
$$;
```

#### 2.2 複数リポジトリ同期関数

```sql
-- 複数リポジトリ同期用のRPC関数
-- GitHubから取得したリポジトリデータを一括でupsertする
CREATE OR REPLACE FUNCTION sync_repositories(
  p_user_id UUID,
  p_repositories JSONB
)
RETURNS TABLE(
  operation TEXT,
  repository_id UUID,
  full_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  repo JSONB;
  new_repo_id UUID;
BEGIN
  -- 入力されたリポジトリデータをループ処理
  FOR repo IN SELECT * FROM jsonb_array_elements(p_repositories)
  LOOP
    -- リポジトリをupsert
    INSERT INTO user_repositories (
      user_id,
      github_repo_id,
      owner,
      name,
      full_name,
      description,
      default_branch,
      language
    )
    VALUES (
      p_user_id,
      (repo->>'github_repo_id')::BIGINT,
      repo->>'owner',
      repo->>'name',
      repo->>'full_name',
      repo->>'description',
      COALESCE(repo->>'default_branch', 'main'),
      repo->>'language'
    )
    ON CONFLICT (user_id, github_repo_id)
    DO UPDATE SET
      description = EXCLUDED.description,
      default_branch = EXCLUDED.default_branch,
      language = EXCLUDED.language,
      updated_at = NOW()
    RETURNING id INTO new_repo_id;

    -- 結果を返す
    RETURN QUERY SELECT
      CASE
        WHEN (SELECT created_at FROM user_repositories WHERE id = new_repo_id) =
             (SELECT updated_at FROM user_repositories WHERE id = new_repo_id)
        THEN 'created'
        ELSE 'updated'
      END,
      new_repo_id,
      repo->>'full_name';
  END LOOP;

  RETURN;
END;
$$;
```

#### 2.3 リポジトリ統計情報取得関数

```sql
-- リポジトリ統計情報取得用のRPC関数
CREATE OR REPLACE FUNCTION get_repository_stats(p_user_id UUID)
RETURNS TABLE(
  total_repositories BIGINT,
  selected_repository_id UUID,
  selected_repository_name TEXT,
  last_accessed TIMESTAMPTZ,
  languages JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) as total_count,
      COALESCE(
        JSONB_OBJECT_AGG(
          COALESCE(language, 'Unknown'),
          lang_count
        ),
        '{}'::JSONB
      ) as lang_stats
    FROM (
      SELECT
        language,
        COUNT(*) as lang_count
      FROM user_repositories
      WHERE user_id = p_user_id
      GROUP BY language
    ) lang_counts
  ),
  selected AS (
    SELECT
      id as selected_id,
      name as selected_name,
      last_accessed_at
    FROM user_repositories
    WHERE user_id = p_user_id AND is_selected = true
    LIMIT 1
  )
  SELECT
    stats.total_count,
    selected.selected_id,
    selected.selected_name,
    selected.last_accessed_at,
    stats.lang_stats
  FROM stats
  LEFT JOIN selected ON true;
END;
$$;
```

#### 2.4 アクセス履歴更新関数

```sql
-- アクセス履歴更新用のRPC関数
CREATE OR REPLACE FUNCTION update_repository_access(
  p_user_id UUID,
  p_repository_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_repositories
  SET last_accessed_at = NOW()
  WHERE id = p_repository_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repository not found or access denied';
  END IF;
END;
$$;
```

#### 2.5 非アクティブリポジトリクリーンアップ関数

```sql
-- 非アクティブリポジトリクリーンアップ用のRPC関数
-- 指定日数以上アクセスされていない非選択リポジトリを削除
CREATE OR REPLACE FUNCTION cleanup_inactive_repositories(
  p_user_id UUID,
  p_days_threshold INTEGER DEFAULT 30
)
RETURNS TABLE(
  deleted_count BIGINT,
  deleted_repositories TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_repos TEXT[];
  delete_count BIGINT;
BEGIN
  -- 削除対象のリポジトリ名を取得
  SELECT ARRAY_AGG(full_name) INTO deleted_repos
  FROM user_repositories
  WHERE user_id = p_user_id
    AND is_selected = false
    AND last_accessed_at < NOW() - INTERVAL '1 day' * p_days_threshold;

  -- 非アクティブリポジトリを削除
  DELETE FROM user_repositories
  WHERE user_id = p_user_id
    AND is_selected = false
    AND last_accessed_at < NOW() - INTERVAL '1 day' * p_days_threshold;

  GET DIAGNOSTICS delete_count = ROW_COUNT;

  RETURN QUERY SELECT
    delete_count,
    COALESCE(deleted_repos, ARRAY[]::TEXT[]);
END;
$$;
```

### 3. 実行確認

各関数が正しく作成されたか確認してください：

```sql
-- 作成された関数一覧を確認
SELECT
  routine_name,
  routine_type,
  external_language
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'select_repository',
    'sync_repositories',
    'get_repository_stats',
    'update_repository_access',
    'cleanup_inactive_repositories'
  );
```

期待される結果：
- 5つの関数がリストされる
- すべて `routine_type = 'FUNCTION'`
- すべて `external_language = 'PLPGSQL'`

### 4. 権限設定の確認

RLS（Row Level Security）が有効な場合、以下を確認してください：

```sql
-- user_repositories テーブルのRLS設定確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_repositories';
```

### 5. テスト実行（オプション）

関数の動作テストを行う場合：

```sql
-- 例：統計情報取得のテスト
SELECT * FROM get_repository_stats('ユーザーのUUID');
```

## エラーハンドリング

### よくあるエラーと対処法

1. **権限エラー**: `SECURITY DEFINER` が設定されているか確認
2. **テーブル不存在エラー**: `user_repositories` テーブルが作成されているか確認
3. **型エラー**: UUIDとJSONBの型が正しく指定されているか確認

## セキュリティ注意事項

- すべての関数は `SECURITY DEFINER` で実行される
- ユーザーIDによる適切なアクセス制御が実装されている
- SQLインジェクション対策として、パラメータ化クエリを使用

## 次のステップ

RPC関数の作成完了後、以下を確認してください：

1. フロントエンドAPIルートでRPC関数が正しく呼び出されること
2. 認証フローが期待通りに動作すること
3. エラーハンドリングが適切に機能すること

完了したら `AuthProvider` の改良に進んでください。