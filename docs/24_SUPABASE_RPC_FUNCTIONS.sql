-- Supabase RPC Functions for Repository Management

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