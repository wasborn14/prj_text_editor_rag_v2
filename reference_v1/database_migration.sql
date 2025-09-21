-- ===============================================
-- データベース移行SQL（差分のみ）
-- 現在の状態から必要な変更を適用
-- ===============================================

-- 1. まず現在のテーブル状況を確認
-- 以下のクエリでテーブル構造を確認してください：
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- ===============================================
-- A. filesテーブルに不足カラムを追加（存在しない場合のみ）
-- ===============================================

-- repository_idカラムの追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'files' AND column_name = 'repository_id'
    ) THEN
        ALTER TABLE files ADD COLUMN repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE;
    END IF;
END $$;

-- github_shaカラムの追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'files' AND column_name = 'github_sha'
    ) THEN
        ALTER TABLE files ADD COLUMN github_sha TEXT;
    END IF;
END $$;

-- typeカラムの追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'files' AND column_name = 'type'
    ) THEN
        ALTER TABLE files ADD COLUMN type TEXT CHECK(type IN ('file', 'folder')) DEFAULT 'file';
    END IF;
END $$;

-- ===============================================
-- B. repositoriesテーブルに不足カラムを追加
-- ===============================================

-- last_synced_atカラムの追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'repositories' AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE repositories ADD COLUMN last_synced_at TIMESTAMPTZ;
    END IF;
END $$;

-- ===============================================
-- C. test_notesテーブルを削除（存在する場合）
-- ===============================================

DROP TABLE IF EXISTS test_notes CASCADE;

-- ===============================================
-- D. 必要なインデックスを追加（存在しない場合のみ）
-- ===============================================

-- files用インデックス
CREATE INDEX IF NOT EXISTS files_repository_id_idx ON files(repository_id);
CREATE INDEX IF NOT EXISTS files_path_idx ON files(repository_id, path);
CREATE INDEX IF NOT EXISTS files_type_idx ON files(repository_id, type);

-- repositories用インデックス
CREATE INDEX IF NOT EXISTS repositories_user_id_idx ON repositories(user_id);
CREATE INDEX IF NOT EXISTS repositories_is_active_idx ON repositories(user_id, is_active);

-- ===============================================
-- E. RLSポリシーを追加（存在しない場合のみ）
-- ===============================================

-- filesテーブルのRLS有効化
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- filesのRLSポリシー（存在しない場合のみ作成）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'files' AND policyname = 'users_can_manage_own_files'
    ) THEN
        CREATE POLICY "users_can_manage_own_files" ON files
        FOR ALL USING (
            repository_id IN (
                SELECT id FROM repositories WHERE user_id = auth.uid()
            )
        );
    END IF;
END $$;

-- ===============================================
-- F. 既存データの整合性確保
-- ===============================================

-- filesテーブルのUNIQUE制約を追加（存在しない場合）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'files'
        AND constraint_name = 'files_repository_id_path_key'
    ) THEN
        ALTER TABLE files ADD CONSTRAINT files_repository_id_path_key UNIQUE(repository_id, path);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- 制約追加に失敗した場合は重複データをクリーンアップする必要があります
    RAISE NOTICE 'UNIQUE制約の追加に失敗しました。重複データが存在する可能性があります。';
END $$;

-- ===============================================
-- 完了メッセージ
-- ===============================================

-- 移行完了
SELECT 'データベース移行が完了しました' AS status;

-- 現在のテーブル一覧を表示
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;