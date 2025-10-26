-- ============================================================================
-- Supabase データベーススキーマ定義
-- プロジェクト: Text Editor RAG v2
-- 最終更新: 2025-10-26
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. selected_repository テーブル
-- 用途: ユーザーごとの選択されたリポジトリとエディタ状態を保存
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.selected_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_id INTEGER NOT NULL,
  repository_full_name TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  repository_owner TEXT NOT NULL,
  last_opened_file_path TEXT,
  expanded_folders JSONB DEFAULT '[]'::jsonb,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- コメント追加（ドキュメント目的）
COMMENT ON TABLE public.selected_repository IS 'ユーザーごとの選択されたリポジトリとエディタ状態';
COMMENT ON COLUMN public.selected_repository.last_opened_file_path IS '最後に開いたファイルの相対パス（例: src/App.tsx）';
COMMENT ON COLUMN public.selected_repository.expanded_folders IS '展開されているフォルダパスのJSON配列（例: ["src", "src/components"]）';

-- RLSを有効化
ALTER TABLE public.selected_repository ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のレコードのみ参照可能
CREATE POLICY "Users can view their own selected repository"
  ON public.selected_repository
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のレコードを挿入可能
CREATE POLICY "Users can insert their own selected repository"
  ON public.selected_repository
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のレコードを更新可能
CREATE POLICY "Users can update their own selected repository"
  ON public.selected_repository
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のレコードを削除可能
CREATE POLICY "Users can delete their own selected repository"
  ON public.selected_repository
  FOR DELETE
  USING (auth.uid() = user_id);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_selected_repository_user_id ON public.selected_repository(user_id);
CREATE INDEX IF NOT EXISTS idx_selected_repository_updated_at ON public.selected_repository(updated_at DESC);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_selected_repository_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_selected_repository_updated_at
  BEFORE UPDATE ON public.selected_repository
  FOR EACH ROW
  EXECUTE FUNCTION update_selected_repository_updated_at();

-- ----------------------------------------------------------------------------
-- 2. user_github_tokens テーブル
-- 用途: ユーザーごとのGitHub Personal Access Tokenを保存
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_github_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  github_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- コメント追加
COMMENT ON TABLE public.user_github_tokens IS 'ユーザーごとのGitHub Personal Access Token';
COMMENT ON COLUMN public.user_github_tokens.github_token IS 'GitHub Personal Access Token（暗号化推奨）';
COMMENT ON COLUMN public.user_github_tokens.expires_at IS 'トークンの有効期限（オプション）';

-- RLSを有効化
ALTER TABLE public.user_github_tokens ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のトークンのみ参照可能
CREATE POLICY "Users can read own tokens"
  ON public.user_github_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分のトークンを挿入可能
CREATE POLICY "Users can insert own tokens"
  ON public.user_github_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のトークンを更新可能
CREATE POLICY "Users can update own tokens"
  ON public.user_github_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のトークンを削除可能
CREATE POLICY "Users can delete own tokens"
  ON public.user_github_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_user_github_tokens_user_id ON public.user_github_tokens(user_id);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_user_github_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_github_tokens_updated_at
  BEFORE UPDATE ON public.user_github_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_user_github_tokens_updated_at();

-- 有効期限が近いトークンを確認するためのビュー
CREATE OR REPLACE VIEW public.expiring_tokens AS
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
FROM public.user_github_tokens;

-- ユーザーは自分の有効期限情報のみ閲覧可能
GRANT SELECT ON public.expiring_tokens TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. repository_sync_status テーブル
-- 用途: リポジトリごとの最終RAG同期ステータスを保存
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.repository_sync_status (
  repository TEXT PRIMARY KEY,
  last_synced_at TIMESTAMPTZ NOT NULL,
  last_sync_status TEXT NOT NULL CHECK (last_sync_status IN ('success', 'error')),
  files_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- コメント追加
COMMENT ON TABLE public.repository_sync_status IS 'リポジトリごとのRAG同期ステータス';
COMMENT ON COLUMN public.repository_sync_status.repository IS 'リポジトリ名（例: "wasborn14/prj-docs"）';
COMMENT ON COLUMN public.repository_sync_status.last_sync_status IS '最終同期ステータス（"success" or "error"）';

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_repository_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_repository_sync_status_updated_at
  BEFORE UPDATE ON public.repository_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_repository_sync_status_updated_at();

-- RLS (Row Level Security) 有効化
ALTER TABLE public.repository_sync_status ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全レコード読み取り可能
CREATE POLICY "Authenticated users can read all sync status"
  ON public.repository_sync_status
  FOR SELECT
  TO authenticated
  USING (true);

-- 認証済みユーザーは全レコード操作可能
CREATE POLICY "Authenticated users can update sync status"
  ON public.repository_sync_status
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_repository_sync_status_updated_at ON public.repository_sync_status(updated_at DESC);

-- ============================================================================
-- 使用例
-- ============================================================================

-- 1. user_github_tokens の使用例
-- ユーザーがGitHub Personal Access Tokenを保存
/*
INSERT INTO public.user_github_tokens (
  user_id,
  github_token,
  expires_at
) VALUES (
  auth.uid(),
  'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  NOW() + INTERVAL '90 days'
)
ON CONFLICT (user_id)
DO UPDATE SET
  github_token = EXCLUDED.github_token,
  expires_at = EXCLUDED.expires_at;
*/

-- 2. selected_repository の使用例
-- ユーザーがリポジトリを選択した際に保存
/*
INSERT INTO public.selected_repository (
  user_id,
  repository_id,
  repository_full_name,
  repository_name,
  repository_owner,
  last_opened_file_path,
  expanded_folders
) VALUES (
  auth.uid(),
  123456,
  'wasborn14/prj-docs',
  'prj-docs',
  'wasborn14',
  'src/App.tsx',
  '["src", "src/components"]'::jsonb
)
ON CONFLICT (user_id)
DO UPDATE SET
  repository_id = EXCLUDED.repository_id,
  repository_full_name = EXCLUDED.repository_full_name,
  repository_name = EXCLUDED.repository_name,
  repository_owner = EXCLUDED.repository_owner,
  last_opened_file_path = EXCLUDED.last_opened_file_path,
  expanded_folders = EXCLUDED.expanded_folders,
  selected_at = NOW();
*/

-- 3. repository_sync_status の使用例
-- RAG同期完了後にステータスを保存
/*
INSERT INTO public.repository_sync_status (
  repository,
  last_synced_at,
  last_sync_status,
  files_count,
  updated_by
) VALUES (
  'wasborn14/prj-docs',
  NOW(),
  'success',
  47,
  auth.uid()
)
ON CONFLICT (repository)
DO UPDATE SET
  last_synced_at = EXCLUDED.last_synced_at,
  last_sync_status = EXCLUDED.last_sync_status,
  files_count = EXCLUDED.files_count,
  error_message = NULL,
  updated_by = EXCLUDED.updated_by;
*/
