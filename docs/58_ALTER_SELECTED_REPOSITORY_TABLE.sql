-- エディタ状態を保存するためのカラムを追加
-- 実行: Supabase Dashboard > SQL Editor で実行

ALTER TABLE public.selected_repository
ADD COLUMN IF NOT EXISTS last_opened_file_path text,
ADD COLUMN IF NOT EXISTS expanded_folders jsonb DEFAULT '[]'::jsonb;

-- コメント追加（ドキュメント目的）
COMMENT ON COLUMN public.selected_repository.last_opened_file_path IS '最後に開いたファイルの相対パス（例: src/App.tsx）';
COMMENT ON COLUMN public.selected_repository.expanded_folders IS '展開されているフォルダパスのJSON配列（例: ["src", "src/components"]）';
