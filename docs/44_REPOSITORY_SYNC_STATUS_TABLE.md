# Repository Sync Status Table

## テーブル定義

Supabaseで以下のSQLを実行してテーブルを作成してください。

```sql
-- リポジトリごとの最終同期ステータステーブル
CREATE TABLE IF NOT EXISTS repository_sync_status (
  repository TEXT PRIMARY KEY,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_sync_status TEXT NOT NULL CHECK (last_sync_status IN ('success', 'error')),
  files_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repository_sync_status_updated_at
  BEFORE UPDATE ON repository_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 有効化
ALTER TABLE repository_sync_status ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全レコード読み取り可能
CREATE POLICY "Authenticated users can read all sync status"
  ON repository_sync_status
  FOR SELECT
  TO authenticated
  USING (true);

-- 認証済みユーザーは自分が更新したレコードを更新可能
CREATE POLICY "Authenticated users can update sync status"
  ON repository_sync_status
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

## テーブル構造

| カラム名 | 型 | 説明 |
|---------|-----|------|
| repository | TEXT | リポジトリ名（例: "wasborn14/prj-docs"）- PRIMARY KEY |
| last_synced_at | TIMESTAMP WITH TIME ZONE | 最終同期日時 |
| last_sync_status | TEXT | 最終同期ステータス（"success" or "error"） |
| files_count | INTEGER | 同期されたファイル数 |
| error_message | TEXT | エラーメッセージ（エラー時のみ） |
| updated_by | UUID | 更新したユーザーID |
| created_at | TIMESTAMP WITH TIME ZONE | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | 更新日時（自動更新） |

## 使用例

### 同期完了後にステータスを保存

```typescript
await supabase.from('repository_sync_status').upsert({
  repository: 'wasborn14/prj-docs',
  last_synced_at: new Date().toISOString(),
  last_sync_status: 'success',
  files_count: 47,
  updated_by: user.id
})
```

### 最終同期情報を取得

```typescript
const { data } = await supabase
  .from('repository_sync_status')
  .select('last_synced_at, files_count, last_sync_status')
  .eq('repository', 'wasborn14/prj-docs')
  .single()

// data: { last_synced_at: "2025-10-04T15:30:00Z", files_count: 47, last_sync_status: "success" }
```
