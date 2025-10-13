# Supabaseデータベーススキーマセットアップ

## 概要

RAGシステムフロントエンド用のSupabaseデータベーススキーマのセットアップ手順と実行済みSQL。

## 実行日時

**作成日**: 2025年1月23日
**プロジェクト**: ymolsaawfqqsusohuyym.supabase.co
**ステータス**: ✅ 完了

## 実行したSQLスクリプト

### 完全なスキーマ作成SQL

```sql
-- 1. profiles テーブル作成
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  github_username TEXT,
  github_id BIGINT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_repositories テーブル作成
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

-- 3. RLS (Row Level Security) 有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_repositories ENABLE ROW LEVEL SECURITY;

-- 4. profiles のポリシー作成
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- 5. user_repositories のポリシー作成
CREATE POLICY "Users can manage own repositories" ON user_repositories
  FOR ALL USING (auth.uid() = user_id);

-- 6. インデックス作成（パフォーマンス向上）
CREATE INDEX idx_profiles_github_id ON profiles(github_id);
CREATE INDEX idx_user_repositories_user_id ON user_repositories(user_id);
CREATE INDEX idx_user_repositories_selected ON user_repositories(user_id, is_selected) WHERE is_selected = true;
CREATE INDEX idx_user_repositories_github_id ON user_repositories(github_repo_id);

-- 7. updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. updated_at トリガー設定
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_repositories_updated_at
  BEFORE UPDATE ON user_repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 作成されたテーブル構造

### profiles テーブル

| フィールド名 | データ型 | 制約 | 説明 |
|-------------|----------|------|------|
| `id` | UUID | PRIMARY KEY, REFERENCES auth.users(id) | Supabase認証ユーザーID |
| `github_username` | TEXT | | GitHubユーザー名 |
| `github_id` | BIGINT | UNIQUE | GitHub内部ID |
| `display_name` | TEXT | | 表示名 |
| `avatar_url` | TEXT | | プロフィール画像URL |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 最終更新日時 |

### user_repositories テーブル

| フィールド名 | データ型 | 制約 | 説明 |
|-------------|----------|------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 内部ID |
| `user_id` | UUID | REFERENCES profiles(id) ON DELETE CASCADE | 所有ユーザーID |
| `github_repo_id` | BIGINT | NOT NULL | GitHubリポジトリID |
| `owner` | TEXT | NOT NULL | リポジトリ所有者 |
| `name` | TEXT | NOT NULL | リポジトリ名 |
| `full_name` | TEXT | NOT NULL | 完全名 (owner/repo) |
| `description` | TEXT | | リポジトリ説明 |
| `default_branch` | TEXT | DEFAULT 'main' | デフォルトブランチ |
| `language` | TEXT | | 主要プログラミング言語 |
| `is_selected` | BOOLEAN | DEFAULT FALSE | 現在選択中フラグ |
| `last_accessed_at` | TIMESTAMPTZ | DEFAULT NOW() | 最終アクセス日時 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 作成日時 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 最終更新日時 |

**制約**:
- `UNIQUE(user_id, github_repo_id)`: 同一ユーザーが同じリポジトリを重複登録できない

## セキュリティ設定

### Row Level Security (RLS)

両テーブルでRLSが有効化されており、以下のポリシーが適用されています:

#### profiles テーブル
```sql
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);
```
- ユーザーは自分のプロフィールのみアクセス可能

#### user_repositories テーブル
```sql
CREATE POLICY "Users can manage own repositories" ON user_repositories
  FOR ALL USING (auth.uid() = user_id);
```
- ユーザーは自分が登録したリポジトリのみアクセス可能

## パフォーマンス最適化

### インデックス

作成されたインデックス:

1. `idx_profiles_github_id` - GitHub IDでの高速検索
2. `idx_user_repositories_user_id` - ユーザー別リポジトリの高速取得
3. `idx_user_repositories_selected` - 選択中リポジトリの高速特定
4. `idx_user_repositories_github_id` - GitHub リポジトリIDでの高速検索

### 自動更新トリガー

`updated_at`フィールドは以下のトリガーにより自動更新されます:

- `update_profiles_updated_at` - profilesテーブル用
- `update_user_repositories_updated_at` - user_repositoriesテーブル用

## 動作確認

### 基本的な確認項目

✅ **テーブル作成確認**
- Table Editor で `profiles` テーブルが表示される
- Table Editor で `user_repositories` テーブルが表示される

✅ **RLS確認**
- Authentication → Policies で2つのポリシーが表示される

✅ **インデックス確認**
- Database → インデックス一覧で4つのインデックスが表示される

### サンプルデータでのテスト

```sql
-- プロフィール作成テスト（認証後に実行）
INSERT INTO profiles (id, github_username, github_id, display_name)
VALUES (auth.uid(), 'testuser', 12345, 'Test User');

-- リポジトリ登録テスト
INSERT INTO user_repositories (
  user_id, github_repo_id, owner, name, full_name, description, language, is_selected
) VALUES (
  auth.uid(), 87654321, 'testuser', 'sample-repo', 'testuser/sample-repo',
  'A sample repository', 'TypeScript', true
);

-- 選択中リポジトリ取得テスト
SELECT name, full_name, description FROM user_repositories
WHERE user_id = auth.uid() AND is_selected = true;
```

## トラブルシューティング

### よくあるエラー

#### `relation "auth.users" does not exist`
**原因**: Supabase認証が有効になっていない
**解決**: Authentication → Settings で認証機能を有効化

#### `permission denied for table profiles`
**原因**: RLSポリシーが正しく設定されていない
**解決**:
1. 認証状態を確認
2. ポリシーの再作成
3. `auth.uid()`が正しく動作するか確認

#### `duplicate key value violates unique constraint`
**原因**: 同一ユーザーが同じリポジトリを重複登録
**解決**: `ON CONFLICT`句を使用した upsert 処理に変更

### メンテナンス用SQL

```sql
-- 全ユーザーのリポジトリ数確認
SELECT
  p.github_username,
  COUNT(ur.id) as repository_count,
  COUNT(CASE WHEN ur.is_selected THEN 1 END) as selected_count
FROM profiles p
LEFT JOIN user_repositories ur ON p.id = ur.user_id
GROUP BY p.id, p.github_username;

-- 選択中リポジトリの確認
SELECT
  p.github_username,
  ur.full_name,
  ur.language,
  ur.last_accessed_at
FROM profiles p
JOIN user_repositories ur ON p.id = ur.user_id
WHERE ur.is_selected = true;

-- 古いアクセス記録のクリーンアップ（30日以上前）
DELETE FROM user_repositories
WHERE last_accessed_at < NOW() - INTERVAL '30 days'
  AND is_selected = false;
```

## 次のステップ

スキーマ作成完了後の実装順序:

1. **フロントエンド型定義作成** - TypeScript用の型定義
2. **API Routes実装** - `/api/profile`, `/api/repositories`
3. **AuthProvider改良** - プロフィール作成機能追加
4. **リポジトリ選択UI** - コンポーネント実装
5. **GitHub API統合** - リポジトリ同期機能

このスキーマにより、効率的で安全なユーザーデータ管理が実現されます。