# ファイル/フォルダ作成機能 実装プラン

## 概要

サイドバーのヘッダーから新規ファイル・フォルダを作成できる機能を実装する。
VSCodeライクなインラインUIで、GitHubリポジトリに直接ファイル/フォルダを作成。

## 1. UI/UX フロー

### ファイル作成フロー

```
1. FilePlus ボタンをクリック
   ↓
2. インラインで入力フィールドを表示
   - 現在選択中のディレクトリ配下、または選択なしならルート
   - プレースホルダー: "filename.ext"
   ↓
3. ファイル名を入力してEnter
   ↓
4. GitHub API でファイル作成
   - 空のコンテンツで commit
   - メッセージ: "Create {filename}"
   ↓
5. サイドバーのファイルリストを更新
   ↓
6. 作成したファイルを自動的に開く
```

### フォルダ作成フロー

```
1. FolderPlus ボタンをクリック
   ↓
2. インラインで入力フィールドを表示
   - 現在選択中のディレクトリ配下、または選択なしならルート
   - プレースホルダー: "folder-name"
   ↓
3. フォルダ名を入力してEnter
   ↓
4. GitHub API でフォルダ作成
   - .gitkeep ファイルを配置（Gitはフォルダのみを追跡できないため）
   - メッセージ: "Create {foldername}"
   ↓
5. サイドバーのファイルリストを更新
   ↓
6. フォルダを展開状態で表示
```

## 2. 必要なコンポーネント

### CreateFileInput コンポーネント（新規作成）

**パス**: `frontend/src/components/molecules/CreateFileInput/CreateFileInput.tsx`

```typescript
interface CreateFileInputProps {
  type: 'file' | 'folder'
  parentPath: string  // 親ディレクトリのパス（例: "src/components"）
  onConfirm: (name: string) => void
  onCancel: () => void
}

export function CreateFileInput({
  type,
  parentPath,
  onConfirm,
  onCancel
}: CreateFileInputProps) {
  // 機能:
  // - インライン入力フィールド
  // - Enter で確定、Escape でキャンセル
  // - バリデーション（ファイル名の検証）
  // - フォーカス外れでキャンセル
}
```

**UI仕様**:
- ファイルツリーのアイテムとして表示
- 編集可能な入力フィールド
- アイコン: ファイルは `File`、フォルダは `Folder`
- 親パスの表示（グレーアウト）

## 3. State管理 (Zustand)

### SidebarStore に追加

**パス**: `frontend/src/stores/sidebarStore.ts`

```typescript
interface SidebarState {
  // ... 既存の状態

  // 新規作成中のアイテム情報
  creatingItem: {
    type: 'file' | 'folder'
    parentPath: string
  } | null

  // アクション
  setCreatingItem: (item: { type: 'file' | 'folder', parentPath: string } | null) => void
  cancelCreating: () => void
}

// 実装例
export const useSidebarStore = create<SidebarState>((set) => ({
  // ...
  creatingItem: null,

  setCreatingItem: (item) => set({ creatingItem: item }),

  cancelCreating: () => set({ creatingItem: null }),
}))
```

## 4. API実装

### GitHub API エンドポイント（新規作成）

**パス**: `frontend/src/app/api/github/create-file/route.ts`

```typescript
interface CreateFileRequest {
  repositoryId: string
  owner: string
  name: string
  filePath: string      // 例: "src/components/NewComponent.tsx"
  content?: string      // デフォルトは空文字列
  message?: string      // コミットメッセージ
  isFolder?: boolean    // true の場合は .gitkeep を作成
}

interface CreateFileResponse {
  success: boolean
  sha: string
  path: string
  message: string
  error?: string
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1. 認証確認
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. リクエスト解析
  const { repositoryId, owner, name, filePath, content, message, isFolder } = await request.json()

  // 3. リポジトリ所有権確認
  const { data: repository } = await supabase
    .from('user_repositories')
    .select('id')
    .eq('id', repositoryId)
    .eq('user_id', session.user.id)
    .single()

  if (!repository) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 403 })
  }

  // 4. GitHub API でファイル作成
  const accessToken = session.provider_token
  const actualPath = isFolder ? `${filePath}/.gitkeep` : filePath
  const actualContent = content || ''

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}/contents/${actualPath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message || `Create ${filePath}`,
        content: Buffer.from(actualContent, 'utf-8').toString('base64'),
      }),
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    return NextResponse.json(
      { error: `Failed to create file: ${errorData.message}` },
      { status: response.status }
    )
  }

  const result = await response.json()

  return NextResponse.json({
    success: true,
    sha: result.content.sha,
    path: actualPath,
    message: 'File created successfully'
  })
}
```

## 5. カスタムフック

### useCreateFile（新規作成）

**パス**: `frontend/src/hooks/useCreateFile.ts`

```typescript
interface CreateFileParams {
  repositoryId: string
  owner: string
  name: string
  filePath: string
  content?: string
  isFolder?: boolean
}

export const useCreateFile = () => {
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createFile = async (params: CreateFileParams): Promise<boolean> => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/github/create-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create file')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      return false
    } finally {
      setIsCreating(false)
    }
  }

  return {
    createFile,
    isCreating,
    error,
    clearError: () => setError(null),
  }
}
```

## 6. 実装ファイル一覧

```
1. コンポーネント
   ├── frontend/src/components/molecules/CreateFileInput/CreateFileInput.tsx (新規)
   └── frontend/src/components/organisms/Sidebar/SidebarHeader.tsx (修正)

2. API Routes
   └── frontend/src/app/api/github/create-file/route.ts (新規)

3. Hooks
   └── frontend/src/hooks/useCreateFile.ts (新規)

4. Store
   └── frontend/src/stores/sidebarStore.ts (修正)

5. 親コンポーネント
   ├── frontend/src/components/organisms/Sidebar/Sidebar.tsx (修正)
   └── frontend/src/components/organisms/Sidebar/SidebarContent.tsx (修正)
```

## 7. 実装順序

### Phase 1: 基本UI（1-3）
1. **CreateFileInput コンポーネント作成**
   - インライン入力フィールドのUI
   - Enter/Escape キーハンドリング
   - 基本的なバリデーション

2. **SidebarHeader にボタンハンドラー追加**
   - onCreateFile/onCreateFolder の実装
   - sidebarStore の creatingItem を更新

3. **sidebarStore に状態管理追加**
   - creatingItem state
   - setCreatingItem/cancelCreating actions

### Phase 2: API統合（4-6）
4. **/api/github/create-file エンドポイント作成**
   - GitHub API との連携
   - 認証・認可処理
   - エラーハンドリング

5. **useCreateFile カスタムフック作成**
   - API呼び出しロジック
   - ローディング状態管理
   - エラー処理

6. **Sidebar で作成処理を実行**
   - CreateFileInput の onConfirm で useCreateFile を呼び出し
   - 成功時にファイルリストを更新

### Phase 3: UX改善（7-10）
7. **ファイル作成後に自動的に開く**
   - editorStore の openFile を呼び出し
   - 作成したファイルをアクティブに

8. **ファイルリストの更新**
   - TanStack Query のキャッシュ無効化
   - 作成したアイテムを表示

9. **バリデーション強化**
   - 重複チェック
   - 禁止文字チェック
   - パス検証

10. **エラーハンドリング**
    - useToast でエラー通知
    - リトライ機能（オプション）

## 8. バリデーション仕様

### ファイル名バリデーション

```typescript
import { z } from 'zod'

const fileNameSchema = z.string()
  .min(1, 'Filename cannot be empty')
  .max(255, 'Filename is too long')
  .regex(/^[^/\\:*?"<>|]+$/, 'Invalid filename characters')
  .refine((name) => !name.startsWith('.'), 'Filename cannot start with dot')
  .refine((name) => name.trim() === name, 'Filename cannot have leading/trailing spaces')
```

### 禁止文字
- `/` - パス区切り
- `\` - Windowsパス区切り
- `:` - Windowsドライブ指定
- `*` - ワイルドカード
- `?` - ワイルドカード
- `"` - クォート
- `<`, `>` - リダイレクト
- `|` - パイプ

### 重複チェック

```typescript
const checkDuplicate = (fileName: string, files: FileTreeNode[]): boolean => {
  return files.some(file => file.name === fileName)
}
```

## 9. エッジケース・考慮事項

### GitHub制約
- **フォルダ管理**: Gitはフォルダのみを追跡できないため `.gitkeep` を使用
- **空ファイル**: 空のファイルも作成可能
- **ファイルサイズ制限**: 100MB（GitHub API の制限）
- **レート制限**: 認証済みユーザーは 5000 リクエスト/時間

### UX
- **作成中のローディング状態**: ボタンを無効化、スピナー表示
- **作成失敗時のエラー表示**: トースト通知で詳細を表示
- **Escapeキーでキャンセル**: 入力中に Escape でキャンセル
- **フォーカス外れでキャンセル**: 他の場所をクリックで自動キャンセル
- **同名ファイルの上書き確認**: 確認ダイアログを表示

### セキュリティ
- **パストラバーサル防止**: `../` を含むパスを拒否
- **リポジトリ所有権確認**: Supabase で user_id をチェック
- **GitHub token の安全な使用**: サーバーサイドでのみ使用

## 10. テストケース

### 正常系
- [x] ルートディレクトリにファイル作成
- [x] サブディレクトリにファイル作成
- [x] フォルダ作成（.gitkeep 付き）
- [x] 拡張子付きファイル作成
- [x] 作成後にエディタで開く

### 異常系
- [x] 空のファイル名
- [x] 禁止文字を含むファイル名
- [x] 既存ファイルと同名
- [x] 長すぎるファイル名（>255文字）
- [x] GitHub API エラー（403, 404, 500）
- [x] ネットワークエラー

### UI/UX
- [x] Enter キーで確定
- [x] Escape キーでキャンセル
- [x] フォーカス外れでキャンセル
- [x] ローディング中はボタン無効化
- [x] エラー時にトースト表示

## 11. 参考実装

### VSCode のファイル作成フロー
- インライン入力フィールド
- リアルタイムバリデーション
- 作成後に自動的に開く
- フォルダは自動的に展開

### GitHub Web UI
- ファイル作成ボタン → フォーム → コミット
- プレビュー機能
- コミットメッセージのカスタマイズ

## 12. 今後の拡張

- [ ] ファイルテンプレート（React Component, TypeScript など）
- [ ] ドラッグ&ドロップでファイルアップロード
- [ ] 複数ファイルの一括作成
- [ ] ファイル名の自動補完
- [ ] 最近使ったディレクトリの記憶

## 関連ドキュメント

- [38_GITHUB_OAUTH_AUTHENTICATION.md](./38_GITHUB_OAUTH_AUTHENTICATION.md) - GitHub認証フロー
- [36_FILE_EDITOR_IMPLEMENTATION_PLAN.md](./36_FILE_EDITOR_IMPLEMENTATION_PLAN.md) - エディタ実装
- [22_SUPABASE_DATA_MANAGEMENT.md](./22_SUPABASE_DATA_MANAGEMENT.md) - データ管理
