-- ===============================================
-- VSCode風Markdownエディター用データベーススキーマ
-- 最終版: repositories + files のみのシンプル構成
-- ===============================================

-- 1. pgvector拡張を有効化（セマンティック検索用）
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. ユーザープロフィールテーブル（auth.usersと連携）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  github_username TEXT,
  github_id BIGINT,
  avatar_url TEXT,
  github_access_token TEXT, -- 暗号化されたGitHubアクセストークン
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. GitHubリポジトリ管理テーブル（ユーザー別）
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  github_repo_id BIGINT NOT NULL, -- GitHubのリポジトリID
  owner TEXT NOT NULL, -- リポジトリオーナー (e.g., "wasborn14")
  name TEXT NOT NULL, -- リポジトリ名 (e.g., "test-editor")
  full_name TEXT NOT NULL, -- フルネーム (e.g., "wasborn14/test-editor")
  default_branch TEXT DEFAULT 'main',
  is_active BOOLEAN DEFAULT false, -- 現在選択中のリポジトリ
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, github_repo_id)
);

-- 4. ファイル管理テーブル（リポジトリ別）
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  path TEXT NOT NULL, -- リポジトリ内の相対パス (e.g., "docs/README.md")
  name TEXT NOT NULL, -- ファイル名 (e.g., "README.md")
  type TEXT CHECK(type IN ('file', 'folder')) DEFAULT 'file',
  content TEXT, -- Markdownコンテンツ
  github_sha TEXT, -- Git SHA（同期用）
  embedding VECTOR(1536), -- OpenAI embeddings（セマンティック検索用）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, path)
);

-- ===============================================
-- 5. Row Level Security (RLS) を有効化
-- ===============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- 6. RLS ポリシー作成（マルチテナント対応）
-- ===============================================

-- プロフィール: 自分のプロフィールのみアクセス可能
CREATE POLICY "users_can_view_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- リポジトリ: 自分のリポジトリのみアクセス可能
CREATE POLICY "users_can_manage_own_repositories" ON repositories
  FOR ALL USING (user_id = auth.uid());

-- ファイル: 自分のリポジトリ内のファイルのみアクセス可能
CREATE POLICY "users_can_manage_own_files" ON files
  FOR ALL USING (
    repository_id IN (
      SELECT id FROM repositories WHERE user_id = auth.uid()
    )
  );

-- ===============================================
-- 7. インデックス作成（パフォーマンス向上）
-- ===============================================

-- プロフィール検索用
CREATE INDEX profiles_github_username_idx ON profiles(github_username);
CREATE INDEX profiles_github_id_idx ON profiles(github_id);

-- リポジトリ検索用
CREATE INDEX repositories_user_id_idx ON repositories(user_id);
CREATE INDEX repositories_github_repo_id_idx ON repositories(github_repo_id);
CREATE INDEX repositories_is_active_idx ON repositories(user_id, is_active);

-- ファイル検索用
CREATE INDEX files_repository_id_idx ON files(repository_id);
CREATE INDEX files_path_idx ON files(repository_id, path);
CREATE INDEX files_type_idx ON files(repository_id, type);

-- ベクトル検索用（セマンティック検索）
CREATE INDEX files_embedding_idx ON files
USING ivfflat (embedding vector_cosine_ops);

-- 全文検索用
CREATE INDEX files_content_fts_idx ON files
USING gin(to_tsvector('english', content));

-- ===============================================
-- 8. 自動タイムスタンプ更新関数
-- ===============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー設定
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repositories_updated_at
    BEFORE UPDATE ON repositories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- 9. プロフィール自動作成トリガー
-- ===============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, created_at)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===============================================
-- 10. セマンティック検索関数
-- ===============================================
CREATE OR REPLACE FUNCTION search_files(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10,
  target_repository_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  repository_id uuid,
  path text,
  name text,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.repository_id,
    f.path,
    f.name,
    f.content,
    1 - (f.embedding <=> query_embedding) AS similarity
  FROM files f
  WHERE f.embedding IS NOT NULL
    AND (target_repository_id IS NULL OR f.repository_id = target_repository_id)
    AND 1 - (f.embedding <=> query_embedding) > match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ===============================================
-- 11. 全文検索関数
-- ===============================================
CREATE OR REPLACE FUNCTION search_files_fulltext(
  search_query text,
  target_repository_id uuid DEFAULT NULL,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  repository_id uuid,
  path text,
  name text,
  content text,
  rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.repository_id,
    f.path,
    f.name,
    f.content,
    ts_rank(to_tsvector('english', f.content), plainto_tsquery('english', search_query)) AS rank
  FROM files f
  WHERE to_tsvector('english', f.content) @@ plainto_tsquery('english', search_query)
    AND (target_repository_id IS NULL OR f.repository_id = target_repository_id)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- ===============================================
-- 完了メッセージ
-- ===============================================
-- スキーマの作成が完了しました
--
-- テーブル構成:
-- - profiles: ユーザープロフィール（GitHub連携）
-- - repositories: GitHubリポジトリ管理
-- - files: リポジトリ内のMarkdownファイル
--
-- 機能:
-- - マルチテナント対応（RLS）
-- - セマンティック検索（pgvector）
-- - 全文検索（PostgreSQL FTS）
-- - 自動タイムスタンプ更新
-- - プロフィール自動作成
-- ===============================================