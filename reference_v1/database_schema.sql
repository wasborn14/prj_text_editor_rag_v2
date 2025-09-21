-- GitHub認証対応マルチテナントスキーマ
-- Supabase SQL Editorで実行してください

-- 1. pgvector拡張を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. プロフィールテーブル（auth.usersとリンク）
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  github_username TEXT,
  github_id BIGINT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  github_access_token TEXT, -- GitHub access token
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. リポジトリ管理テーブル
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  github_repo_id BIGINT,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL, -- "owner/repo"
  default_branch TEXT DEFAULT 'main',
  is_active BOOLEAN DEFAULT FALSE,
  access_token TEXT, -- GitHub access token（暗号化推奨）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, github_repo_id)
);

-- 4. ファイル管理テーブル（リポジトリ別）
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  path TEXT NOT NULL, -- リポジトリ内の相対パス
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('file', 'folder')) DEFAULT 'file',
  content TEXT,
  github_sha TEXT, -- Git SHA（同期用）
  embedding VECTOR(1536), -- OpenAI embeddings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repository_id, path)
);

-- 5. Row Level Security (RLS) を有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- 6. RLS ポリシー作成
-- プロフィール: 自分のプロフィールのみアクセス可能
CREATE POLICY "users_can_view_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_can_insert_own_profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- リポジトリ: 自分のリポジトリのみアクセス可能
CREATE POLICY "users_can_access_own_repositories" ON repositories
  FOR ALL USING (user_id = auth.uid());

-- ファイル: 自分のリポジトリのファイルのみアクセス可能
CREATE POLICY "users_can_access_own_files" ON files
  FOR ALL USING (
    repository_id IN (
      SELECT id FROM repositories WHERE user_id = auth.uid()
    )
  );

-- 7. インデックス作成（パフォーマンス向上）
-- ベクトル検索用インデックス
CREATE INDEX files_embedding_idx ON files
  USING ivfflat (embedding vector_cosine_ops);

-- 全文検索用インデックス
CREATE INDEX files_content_fts ON files
  USING gin(to_tsvector('english', content));

-- 一般的な検索用インデックス
CREATE INDEX repositories_user_id_idx ON repositories(user_id);
CREATE INDEX repositories_active_idx ON repositories(user_id, is_active);
CREATE INDEX files_repository_id_idx ON files(repository_id);
CREATE INDEX files_path_idx ON files(repository_id, path);

-- 8. プロフィール自動作成トリガー
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, created_at)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 9. セマンティック検索用関数
CREATE OR REPLACE FUNCTION search_files(
  user_uuid UUID,
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  repository_id UUID,
  path TEXT,
  name TEXT,
  content TEXT,
  similarity FLOAT
) AS $$
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
  JOIN repositories r ON f.repository_id = r.id
  WHERE r.user_id = user_uuid
    AND f.embedding IS NOT NULL
    AND 1 - (f.embedding <=> query_embedding) > match_threshold
  ORDER BY f.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 更新時刻自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repositories_updated_at
  BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();