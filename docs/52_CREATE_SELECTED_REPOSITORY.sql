-- 選択されたリポジトリを保存するテーブル
CREATE TABLE IF NOT EXISTS public.selected_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_id INTEGER NOT NULL,
  repository_full_name TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  repository_owner TEXT NOT NULL,
  selected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

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
CREATE INDEX idx_selected_repository_user_id ON public.selected_repository(user_id);
CREATE INDEX idx_selected_repository_updated_at ON public.selected_repository(updated_at DESC);

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
