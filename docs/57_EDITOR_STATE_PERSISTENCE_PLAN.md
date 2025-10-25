# エディタ状態の永続化実装プラン

## 概要

ユーザーがリポジトリを切り替えても、以下の状態を保持する機能を実装する：
1. **最後に開いたファイルパス** - ファイルツリーで選択されていたファイル
2. **フォルダの開閉状態** - 展開されていたフォルダのリスト

## アーキテクチャ

### アプローチ：既存テーブル拡張（selected_repository）

**理由**：
- リポジトリごとに1つのエディタ状態を管理すれば十分
- テーブル数を増やさずシンプルに実装可能
- リポジトリ切り替え時に自動的に状態がリセットされる

---

## 実装ステップ

### Step 1: Supabaseテーブルスキーマ更新

`selected_repository`テーブルに2つのカラムを追加：

```sql
ALTER TABLE public.selected_repository
ADD COLUMN last_opened_file_path text,
ADD COLUMN expanded_folders jsonb DEFAULT '[]'::jsonb;
```

#### カラム詳細

| カラム名 | 型 | Nullable | Default | 説明 |
|---------|-----|----------|---------|------|
| `last_opened_file_path` | text | YES | NULL | 最後に開いたファイルの相対パス（例: `src/App.tsx`） |
| `expanded_folders` | jsonb | NO | `[]` | 展開されているフォルダパスの配列（例: `["src", "src/components"]`） |

#### データ例

```json
{
  "last_opened_file_path": "src/components/FileEditor.tsx",
  "expanded_folders": ["src", "src/components", "src/hooks"]
}
```

---

### Step 2: TypeScript型定義更新

**ファイル**: `frontend/src/hooks/useSelectedRepository.ts`

```typescript
interface SelectedRepository {
  id: string
  user_id: string
  repository_id: number
  repository_full_name: string
  repository_name: string
  repository_owner: string
  last_opened_file_path: string | null  // 追加
  expanded_folders: string[]            // 追加
  selected_at: string
  created_at: string
  updated_at: string
}

interface SaveRepositoryParams {
  repository_id: number
  repository_full_name: string
  repository_name: string
  repository_owner: string
  last_opened_file_path?: string | null  // 追加（オプション）
  expanded_folders?: string[]            // 追加（オプション）
}
```

---

### Step 3: API Route更新

**ファイル**: `frontend/src/app/api/selected-repository/route.ts`

#### POST メソッド更新

```typescript
export async function POST(request: Request) {
  // ... 認証処理 ...

  const body = await request.json()
  const {
    repository_id,
    repository_full_name,
    repository_name,
    repository_owner,
    last_opened_file_path,      // 追加
    expanded_folders,           // 追加
  } = body

  // upsert
  const { data, error } = await supabase
    .from('selected_repository')
    .upsert(
      {
        user_id: user.id,
        repository_id,
        repository_full_name,
        repository_name,
        repository_owner,
        last_opened_file_path: last_opened_file_path ?? null,  // 追加
        expanded_folders: expanded_folders ?? [],              // 追加
        selected_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    )
    .select()
    .single()

  // ... 残りの処理 ...
}
```

---

### Step 4: エディタ状態管理用カスタムフック作成

**ファイル**: `frontend/src/hooks/useEditorState.ts`

```typescript
import { useCallback } from 'react'
import { useSelectedRepository } from './useSelectedRepository'
import { useEditorStore } from '@/stores/editorStore'
import { debounce } from 'lodash' // または自作のdebounce

/**
 * エディタ状態（最後に開いたファイル、フォルダ開閉状態）を永続化するフック
 */
export function useEditorState() {
  const { selectedRepository, saveSelectedRepository } = useSelectedRepository()
  const { setSelectedFilePath } = useEditorStore()

  // ファイルパスを保存（即座に実行）
  const saveLastOpenedFile = useCallback(
    async (filePath: string | null) => {
      if (!selectedRepository) return

      await saveSelectedRepository({
        repository_id: selectedRepository.repository_id,
        repository_full_name: selectedRepository.repository_full_name,
        repository_name: selectedRepository.repository_name,
        repository_owner: selectedRepository.repository_owner,
        last_opened_file_path: filePath,
        expanded_folders: selectedRepository.expanded_folders,
      })
    },
    [selectedRepository, saveSelectedRepository]
  )

  // フォルダ開閉状態を保存（デバウンス500ms）
  const saveExpandedFolders = useCallback(
    debounce(async (folders: string[]) => {
      if (!selectedRepository) return

      await saveSelectedRepository({
        repository_id: selectedRepository.repository_id,
        repository_full_name: selectedRepository.repository_full_name,
        repository_name: selectedRepository.repository_name,
        repository_owner: selectedRepository.repository_owner,
        last_opened_file_path: selectedRepository.last_opened_file_path,
        expanded_folders: folders,
      })
    }, 500),
    [selectedRepository, saveSelectedRepository]
  )

  // 状態を復元
  const restoreEditorState = useCallback(() => {
    if (!selectedRepository) return

    // 最後に開いたファイルを復元
    if (selectedRepository.last_opened_file_path) {
      setSelectedFilePath(selectedRepository.last_opened_file_path)
    }

    // フォルダ開閉状態を復元
    return selectedRepository.expanded_folders || []
  }, [selectedRepository, setSelectedFilePath])

  return {
    saveLastOpenedFile,
    saveExpandedFolders,
    restoreEditorState,
  }
}
```

---

### Step 5: FileTreePanel統合

**ファイル**: `frontend/src/components/layout/dashboard/sidebar/FileTreePanel.tsx`

```typescript
import { useEditorState } from '@/hooks/useEditorState'

export function FileTreePanel({ ... }) {
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const { saveLastOpenedFile, saveExpandedFolders, restoreEditorState } = useEditorState()

  // リポジトリ選択時に状態を復元
  useEffect(() => {
    if (selectedRepo) {
      const restored = restoreEditorState()
      if (restored) {
        setExpandedFolders(restored)
      }
    }
  }, [selectedRepo, restoreEditorState])

  // ファイル選択時に保存
  const handleFileSelect = (filePath: string) => {
    setSelectedFilePath(filePath)
    saveLastOpenedFile(filePath)  // 即座に保存
  }

  // フォルダ開閉時に保存
  const handleFolderToggle = (folderPath: string) => {
    const newExpanded = expandedFolders.includes(folderPath)
      ? expandedFolders.filter(f => f !== folderPath)
      : [...expandedFolders, folderPath]

    setExpandedFolders(newExpanded)
    saveExpandedFolders(newExpanded)  // デバウンス付きで保存
  }

  // ...
}
```

---

### Step 6: dashboard/page.tsx統合

**ファイル**: `frontend/src/app/dashboard/page.tsx`

リポジトリ変更時に状態をクリアする処理を追加：

```typescript
const handleRepoChange = async (repoFullName: string) => {
  // 未保存警告...

  const repo = repositories.find((r) => r.full_name === repoFullName)
  setManualSelectedRepo(repo || null)

  // 新しいリポジトリを保存（last_opened_file_pathとexpanded_foldersはnull/[]で初期化）
  if (repo) {
    const [owner, name] = repo.full_name.split('/')
    await saveSelectedRepository({
      repository_id: repo.id,
      repository_full_name: repo.full_name,
      repository_name: name,
      repository_owner: owner,
      last_opened_file_path: null,       // リセット
      expanded_folders: [],              // リセット
    })
  }
}
```

---

## データフロー

### 保存フロー

```
ユーザーアクション
  ↓
[ファイル選択] → saveLastOpenedFile() → API POST → Supabase更新（即座）
  ↓
[フォルダ開閉] → saveExpandedFolders() → デバウンス500ms → API POST → Supabase更新
```

### 復元フロー

```
リポジトリ選択
  ↓
useSelectedRepository (GET API)
  ↓
Supabase → { last_opened_file_path, expanded_folders }
  ↓
restoreEditorState()
  ↓
[エディタ状態を復元]
  - setSelectedFilePath()
  - setExpandedFolders()
```

---

## 実装順序

1. ✅ **SQLマイグレーション実行** - Supabaseでカラム追加
2. ✅ **型定義更新** - TypeScript interfaces更新
3. ✅ **API Route更新** - POST/GETで新カラム処理
4. ✅ **useEditorStateフック作成** - 状態保存/復元ロジック
5. ✅ **FileTreePanel統合** - ファイル選択・フォルダ開閉を保存
6. ✅ **dashboard/page.tsx統合** - リポジトリ切り替え時のクリア処理
7. ✅ **動作確認・テスト**

---

## パフォーマンス考慮事項

### デバウンス

- **ファイル選択**: 即座に保存（頻度低）
- **フォルダ開閉**: 500msデバウンス（連続操作対応）

### キャッシュ戦略

- TanStack Queryの`invalidateQueries`で即座に反映
- staleTime: 5分（現状維持）

---

## エッジケース対応

| ケース | 対応 |
|--------|------|
| 保存されたファイルが削除されている | ファイル選択時にエラーハンドリング（404時は選択解除） |
| 保存されたフォルダが削除されている | フィルタリングで存在するフォルダのみ展開 |
| 複数タブで同時編集 | 最後の更新が優先（Supabase upsert） |
| ネットワークエラー | ローカル状態は保持、再接続時にリトライ不要（次回操作時に保存） |

---

## テストシナリオ

1. **基本フロー**
   - ファイルを選択 → リロード → 同じファイルが開かれている
   - フォルダを展開 → リロード → 同じフォルダが展開されている

2. **リポジトリ切り替え**
   - リポジトリA（ファイルX、フォルダY展開）
   - リポジトリBに切り替え → リセットされる
   - リポジトリAに戻る → ファイルX、フォルダYが復元される

3. **エッジケース**
   - 削除されたファイルを復元しようとする → 選択解除
   - 削除されたフォルダを復元しようとする → スキップ

---

## 将来的な拡張案

- **カーソル位置の保存** - `cursor_position: { line: number, column: number }`
- **スクロール位置の保存** - `scroll_position: number`
- **タブ履歴** - 最近開いたファイルのリスト
- **エディタ設定** - フォントサイズ、テーマなど
