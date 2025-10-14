# GitHub Integration Plan - ファイルツリー変更のGitHub連携

## 概要

ファイルツリーの変更（移動、作成、削除、編集）をGitHub APIを通じてリポジトリに反映する機能の実装計画。

## 仕様

### 1. コミットメッセージ
- **固定メッセージ**: `"text editor updated"`
- すべての操作で同じメッセージを使用

### 2. 反映タイミング
- **ディレクトリ/ファイル移動**: ドラッグ&ドロップ後、即座にGitHub APIに反映
- **ファイル内容編集**: `Ctrl+S` で保存時にGitHub APIに反映
- **ファイル/ディレクトリ作成**: 作成後、即座に反映
- **ファイル/ディレクトリ削除**: 削除後、即座に反映

### 3. UI
- **右クリックメニュー**: 新規ファイル、新規フォルダ、削除、リネーム

### 4. 新規ファイル作成時のデフォルト内容
- ファイルパスを本文に自動挿入

**例:**
```
ファイル: src/components/Button.tsx

デフォルト内容:
src/components/Button.tsx
```

## 必要な変更操作

### 1. ファイル/ディレクトリの移動（Move）
- ドラッグ&ドロップで実装済み（ローカルのみ）
- GitHub API連携を追加

**GitHub API操作:**
- ファイル: 古いパスを削除 → 新しいパスで作成
- ディレクトリ: 全ファイルを再帰的に移動

### 2. ファイル/ディレクトリの作成（Create）
- 右クリックメニューから作成
- ディレクトリ作成時は `.gitkeep` を追加

**GitHub API操作:**
- `PUT /repos/{owner}/{repo}/contents/{path}`

### 3. ファイル/ディレクトリの削除（Delete）
- 右クリックメニューまたはDeleteキーで削除
- ディレクトリ削除時は中身も全て削除

**GitHub API操作:**
- `DELETE /repos/{owner}/{repo}/contents/{path}`

### 4. ファイル内容の編集（Update）
- エディタでファイル内容を編集
- `Ctrl+S` で保存

**GitHub API操作:**
- `PUT /repos/{owner}/{repo}/contents/{path}`
- SHAが必要

## 実装順序

### Phase 1: GitHub API操作関数の実装 【優先度: 高】

**ファイル**: `lib/fileTree/githubOperations.ts` (新規作成)

**実装する関数:**

```typescript
/**
 * ファイルをGitHub上で移動
 */
export async function moveFileOnGitHub(
  token: string,
  owner: string,
  repo: string,
  oldPath: string,
  newPath: string,
  sha: string
): Promise<void>

/**
 * ディレクトリをGitHub上で移動（再帰的）
 */
export async function moveDirectoryOnGitHub(
  token: string,
  owner: string,
  repo: string,
  oldPath: string,
  newPath: string
): Promise<void>

/**
 * ファイルをGitHub上で作成
 */
export async function createFileOnGitHub(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<void>

/**
 * ディレクトリをGitHub上で作成（.gitkeepを追加）
 */
export async function createDirectoryOnGitHub(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<void>

/**
 * ファイルをGitHub上で削除
 */
export async function deleteFileOnGitHub(
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string
): Promise<void>

/**
 * ディレクトリをGitHub上で削除（再帰的）
 */
export async function deleteDirectoryOnGitHub(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<void>

/**
 * ファイル内容をGitHub上で更新
 */
export async function updateFileContentOnGitHub(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha: string
): Promise<void>
```

**実装詳細:**
- 既存の `GitHubClient` クラスを使用
- コミットメッセージは `"text editor updated"` で固定
- エラーハンドリングを追加

**ファイル**: `lib/github.ts` の拡張

GitHubClientに以下のメソッドを追加:
```typescript
async createOrUpdateFileContents(...)
async deleteFile(...)
async getFileContent(...)  // 既存
```

### Phase 2: ドラッグ&ドロップのGitHub連携 【優先度: 高】

**ファイル**: `hooks/fileTree/useFileTreeDragDrop.ts`

**修正箇所**: `handleDragEnd` 関数

**実装内容:**
1. ローカルステート更新（既存）
2. GitHub API呼び出し（新規）
3. エラー時のロールバック（新規）
4. TanStack Query Mutationの使用

**実装例:**
```typescript
const handleDragEnd = useCallback(
  async (event: DragEndEvent) => {
    // ... 既存のバリデーション処理 ...

    // ローカルステートを更新（楽観的更新）
    const oldFileTree = fileTree
    setFileTree(updatedFileTree)

    try {
      // GitHub APIに反映
      const token = useAuthStore.getState().githubToken
      const repo = selectedRepo  // propsから取得

      for (const item of itemsToMove) {
        if (item.type === 'file') {
          await moveFileOnGitHub(
            token,
            repo.owner,
            repo.name,
            item.fullPath,
            newBasePath,
            item.sha
          )
        } else {
          await moveDirectoryOnGitHub(
            token,
            repo.owner,
            repo.name,
            item.fullPath,
            newBasePath
          )
        }
      }

      // 成功時: TanStack Queryのキャッシュを更新
      queryClient.invalidateQueries(['fileTree'])

    } catch (error) {
      // 失敗時: ロールバック
      setFileTree(oldFileTree)
      toast.error('移動に失敗しました')
      console.error(error)
    }
  },
  [...]
)
```

**追加の依存関係:**
- `selectedRepo` をpropsで受け取る
- `useAuthStore` から `githubToken` を取得
- `react-hot-toast` などのトーストライブラリ

### Phase 3: TanStack Query Mutationの実装 【優先度: 高】

**ファイル**: `hooks/fileTree/useFileTreeMutations.ts` (新規作成)

**実装する Mutation:**
```typescript
export function useFileTreeMutations(
  githubToken: string,
  repository: Repository
) {
  const queryClient = useQueryClient()

  const moveFileMutation = useMutation({
    mutationFn: (params: MoveFileParams) =>
      moveFileOnGitHub(...),
    onSuccess: () => {
      queryClient.invalidateQueries(['fileTree'])
    },
    onError: (error) => {
      // エラーハンドリング
    }
  })

  const createFileMutation = useMutation({...})
  const deleteFileMutation = useMutation({...})
  const updateFileMutation = useMutation({...})

  return {
    moveFileMutation,
    createFileMutation,
    deleteFileMutation,
    updateFileMutation,
  }
}
```

### Phase 4: 右クリックメニューの実装 【優先度: 中】

**ファイル**: `components/layout/dashboard/FileTreeContextMenu.tsx` (新規作成)

**メニュー項目:**
- 新規ファイル
- 新規フォルダ
- 削除
- リネーム

**使用ライブラリ:**
- Radix UI Context Menu または
- Headless UI Menu

**実装内容:**
```typescript
export function FileTreeContextMenu({
  node,
  position,
  onClose,
  onCreateFile,
  onCreateDirectory,
  onDelete,
  onRename,
}: FileTreeContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Item onClick={() => onCreateFile(node)}>
        新規ファイル
      </ContextMenu.Item>
      <ContextMenu.Item onClick={() => onCreateDirectory(node)}>
        新規フォルダ
      </ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item onClick={() => onRename(node)}>
        リネーム
      </ContextMenu.Item>
      <ContextMenu.Item onClick={() => onDelete(node)}>
        削除
      </ContextMenu.Item>
    </ContextMenu.Root>
  )
}
```

**ファイル**: `components/layout/dashboard/FileTreePanel.tsx` の修正

右クリックイベントの追加:
```typescript
const [contextMenu, setContextMenu] = useState<{
  node: TreeNode
  x: number
  y: number
} | null>(null)

const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
  e.preventDefault()
  setContextMenu({ node, x: e.clientX, y: e.clientY })
}
```

### Phase 5: モーダルダイアログの実装 【優先度: 中】

**ファイル**: `components/layout/dashboard/FileTreeModals.tsx` (新規作成)

**必要なモーダル:**
1. **新規ファイル名入力モーダル**
2. **新規フォルダ名入力モーダル**
3. **リネーム入力モーダル**
4. **削除確認モーダル**

**使用ライブラリ:**
- Radix UI Dialog または
- Headless UI Dialog

**実装例:**
```typescript
export function CreateFileModal({
  isOpen,
  parentPath,
  onConfirm,
  onCancel,
}: CreateFileModalProps) {
  const [fileName, setFileName] = useState('')

  const handleConfirm = () => {
    const fullPath = parentPath
      ? `${parentPath}/${fileName}`
      : fileName
    onConfirm(fullPath)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogTitle>新規ファイル</DialogTitle>
        <input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="ファイル名を入力"
        />
        <button onClick={handleConfirm}>作成</button>
        <button onClick={onCancel}>キャンセル</button>
      </DialogContent>
    </Dialog>
  )
}
```

### Phase 6: ファイルエディタの実装 【優先度: 中】

**ファイル**: `components/layout/dashboard/FileEditor.tsx` (新規作成)

**エディタライブラリ:**
- Monaco Editor (VS Code) または
- CodeMirror

**実装内容:**
1. ファイル選択時にエディタを表示
2. ファイル内容を取得して表示
3. `Ctrl+S` で保存
4. GitHub APIでファイル内容を更新

**実装例:**
```typescript
export function FileEditor({
  selectedFile,
  onSave,
}: FileEditorProps) {
  const [content, setContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // ファイル内容を取得
  useEffect(() => {
    if (selectedFile) {
      fetchFileContent(selectedFile.path).then(setContent)
    }
  }, [selectedFile])

  // Ctrl+S で保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [content])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateFileContentOnGitHub(
        token,
        owner,
        repo,
        selectedFile.path,
        content,
        selectedFile.sha
      )
      toast.success('保存しました')
    } catch (error) {
      toast.error('保存に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <MonacoEditor
        value={content}
        onChange={setContent}
        language={getLanguageFromPath(selectedFile.path)}
      />
    </div>
  )
}
```

**ファイル**: `components/layout/dashboard/DashboardPage.tsx` の修正

エディタ表示エリアを追加:
```typescript
const [selectedFile, setSelectedFile] = useState<TreeNode | null>(null)

return (
  <div className="flex">
    <FileTreePanel onFileSelect={setSelectedFile} />
    <FileEditor selectedFile={selectedFile} />
  </div>
)
```

### Phase 7: エラーハンドリングとUI改善 【優先度: 中】

**実装内容:**

1. **ローディング状態の表示**
   - 操作中は該当アイテムにスピナーを表示
   - グローバルローディングインジケーター

2. **エラートースト**
   - `react-hot-toast` を使用
   - エラーメッセージを分かりやすく表示

3. **楽観的更新のロールバック**
   - API失敗時は元の状態に戻す
   - ユーザーにエラーを通知

4. **操作の Undo/Redo**（オプション）
   - 操作履歴をスタックで管理
   - Ctrl+Z で元に戻す

**ファイル**: `stores/fileTreeStore.ts` の拡張

```typescript
interface FileTreeState {
  // 既存のステート
  localFileTree: FileTreeItem[]

  // 新規追加
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // 操作履歴（オプション）
  history: FileTreeItem[][]
  historyIndex: number
  undo: () => void
  redo: () => void
}
```

### Phase 8: GitHub API制限への対応 【優先度: 低】

**実装内容:**

1. **Rate Limit対応**
   - Rate Limitをヘッダーから取得
   - 残り回数が少ない場合は警告表示

2. **バッチ処理**
   - 大量のファイル移動時はキューに追加
   - 順次実行して制限を回避

3. **リトライ機構**
   - 失敗時は指数バックオフでリトライ

**ファイル**: `lib/fileTree/githubOperations.ts` の拡張

```typescript
// レート制限チェック
async function checkRateLimit(token: string): Promise<void> {
  const response = await fetch('https://api.github.com/rate_limit', {
    headers: { Authorization: `Bearer ${token}` }
  })
  const data = await response.json()

  if (data.rate.remaining < 100) {
    toast.warning('GitHub APIの制限に近づいています')
  }
}

// リトライ機構
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      )
    }
  }
  throw new Error('Max retries exceeded')
}
```

## データフロー

```
ユーザー操作（D&D / 右クリック / Ctrl+S）
  ↓
1. ローカルZustandストア更新（楽観的更新）
  ↓
2. UIに即座に反映
  ↓
3. GitHub API呼び出し（非同期）
  ↓
4a. 成功
  ↓
  - TanStack Queryキャッシュ更新
  - トースト通知（オプション）

4b. 失敗
  ↓
  - ローカルステートをロールバック
  - エラートースト表示
  - UIを元の状態に戻す
```

## 技術スタック

### 使用ライブラリ
- **GitHub API**: Octokit (既存の `GitHubClient`)
- **状態管理**: TanStack Query Mutation + Zustand
- **UI Components**: Radix UI または Headless UI
- **トースト通知**: react-hot-toast
- **エディタ**: Monaco Editor または CodeMirror

### 新規インストールが必要なパッケージ
```bash
npm install @radix-ui/react-context-menu
npm install @radix-ui/react-dialog
npm install react-hot-toast
npm install @monaco-editor/react
# または
npm install @uiw/react-codemirror
```

## 注意事項

### 1. SHA管理
- ファイルの削除・更新にはSHAが必要
- ツリー構造にSHA情報を保持
- SHAが古い場合はエラーになるため、再取得が必要

### 2. 競合解決
- 他のユーザーが同時に編集している場合
- SHA不一致エラーが発生
- 「最新を取得して再試行」オプションを提供

### 3. 大量のファイル操作
- ディレクトリ移動時は全ファイルを再帰的に処理
- 時間がかかる場合はプログレスバーを表示
- Rate Limitに注意

### 4. トランザクション性
- GitHub APIは複数操作のトランザクションをサポートしない
- 途中で失敗した場合、一部のファイルのみ変更される
- ユーザーに警告を表示

## 実装チェックリスト

### Phase 1: GitHub API操作関数
- [ ] `lib/fileTree/githubOperations.ts` 作成
- [ ] `moveFileOnGitHub` 実装
- [ ] `moveDirectoryOnGitHub` 実装
- [ ] `createFileOnGitHub` 実装（デフォルト内容: ファイルパス）
- [ ] `createDirectoryOnGitHub` 実装（.gitkeep追加）
- [ ] `deleteFileOnGitHub` 実装
- [ ] `deleteDirectoryOnGitHub` 実装
- [ ] `updateFileContentOnGitHub` 実装
- [ ] エラーハンドリング追加

### Phase 2: ドラッグ&ドロップ連携
- [ ] `useFileTreeDragDrop.ts` 修正
- [ ] GitHub API呼び出し追加
- [ ] 楽観的更新実装
- [ ] ロールバック機能実装
- [ ] selectedRepoをpropsで受け取る

### Phase 3: TanStack Query Mutation
- [ ] `hooks/fileTree/useFileTreeMutations.ts` 作成
- [ ] Mutation定義
- [ ] キャッシュ無効化処理

### Phase 4: 右クリックメニュー
- [ ] `FileTreeContextMenu.tsx` 作成
- [ ] `FileTreePanel.tsx` に右クリックイベント追加
- [ ] メニュー項目実装

### Phase 5: モーダルダイアログ
- [ ] `FileTreeModals.tsx` 作成
- [ ] 新規ファイルモーダル実装
- [ ] 新規フォルダモーダル実装
- [ ] リネームモーダル実装
- [ ] 削除確認モーダル実装

### Phase 6: ファイルエディタ
- [ ] `FileEditor.tsx` 作成
- [ ] Monaco Editor統合
- [ ] ファイル内容取得
- [ ] Ctrl+S保存実装
- [ ] GitHub API更新処理

### Phase 7: エラーハンドリング
- [ ] ローディング状態表示
- [ ] エラートースト実装
- [ ] ロールバック機能強化

### Phase 8: GitHub API制限対応
- [ ] Rate Limitチェック実装
- [ ] リトライ機構実装
- [ ] バッチ処理検討

## 参考リンク

- [GitHub REST API - Contents](https://docs.github.com/en/rest/repos/contents)
- [TanStack Query - Mutations](https://tanstack.com/query/latest/docs/react/guides/mutations)
- [Radix UI - Context Menu](https://www.radix-ui.com/docs/primitives/components/context-menu)
- [Monaco Editor React](https://github.com/suren-atoyan/monaco-react)
