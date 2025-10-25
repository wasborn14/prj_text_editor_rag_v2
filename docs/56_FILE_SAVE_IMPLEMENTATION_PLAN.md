# ファイル保存機能実装プラン

## 概要

エディタで編集したファイルをGitHubに保存する機能の実装プラン。

## 保存トリガー

1. **キーボードショートカット**: `Cmd+S` (Mac) / `Ctrl+S` (Windows/Linux)
2. **Saveボタン**: DashboardHeaderのusername横に配置

## 実装要素

### 1. エディタストアの拡張

**ファイル**: `src/stores/editorStore.ts`

```typescript
interface EditorState {
  // 既存のstate
  selectedFilePath: string | null

  // 追加するstate
  isModified: boolean              // 変更があるか
  currentFileSha: string | null    // GitHub APIに必要なSHA
  setIsModified: (modified: boolean) => void
  setCurrentFileSha: (sha: string | null) => void
}
```

### 2. Markdown変換ユーティリティ

**ファイル**: `src/lib/editor/markdownConverter.ts`

TipTapのJSON形式からMarkdown形式への変換関数を追加:

```typescript
export function convertContentToMarkdown(content: JSONContent): string {
  // JSONContent → Markdown文字列に変換
  // generateMarkdown()などのライブラリを使用
}
```

**必要パッケージ**:
- `@tiptap/core`の`generateHTML`または`generateText`
- または手動でJSONをMarkdownに変換

### 3. GitHub API連携

**ファイル**: `src/app/api/github/update-file/route.ts`

```typescript
POST /api/github/update-file

Request Body:
{
  owner: string       // リポジトリオーナー
  repo: string        // リポジトリ名
  path: string        // ファイルパス
  content: string     // 新しいコンテンツ (Markdown)
  sha: string         // 既存ファイルのSHA
  message: string     // コミットメッセージ
}

Response:
{
  success: boolean
  sha?: string        // 新しいSHA
  error?: string
}
```

**実装**:
- `@octokit/rest`の`repos.createOrUpdateFileContents`を使用
- Base64エンコードが必要
- 認証トークンはヘッダーから取得

### 4. キーボードショートカット拡張

**ファイル**: `src/lib/editor/editorExtensions.ts`

```typescript
const SaveExtension = Extension.create({
  name: 'saveShortcut',

  addKeyboardShortcuts() {
    return {
      'Mod-s': () => {
        // グローバルな保存処理をトリガー
        // カスタムイベントまたはコールバック経由
        window.dispatchEvent(new CustomEvent('editor:save'))
        return true // デフォルト動作を防止
      }
    }
  },
})
```

### 5. 保存処理フック

**ファイル**: `src/hooks/useSaveFile.ts`

```typescript
export function useSaveFile() {
  const [isSaving, setIsSaving] = useState(false)
  const { selectedFilePath, currentFileSha, setIsModified, setCurrentFileSha } = useEditorStore()
  const githubToken = useAuthStore((state) => state.githubToken)

  const saveFile = async (
    content: JSONContent,
    owner: string,
    repo: string
  ) => {
    if (!selectedFilePath || !currentFileSha || isSaving) return

    setIsSaving(true)
    try {
      // 1. JSON → Markdown変換
      const markdown = convertContentToMarkdown(content)

      // 2. API呼び出し
      const response = await fetch('/api/github/update-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`
        },
        body: JSON.stringify({
          owner,
          repo,
          path: selectedFilePath,
          content: markdown,
          sha: currentFileSha,
          message: `Update ${selectedFilePath}`
        })
      })

      const data = await response.json()

      if (data.success) {
        // 3. 成功処理
        setCurrentFileSha(data.sha)
        setIsModified(false)
        toast.success('保存しました')
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast.error('保存に失敗しました')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  return { saveFile, isSaving }
}
```

### 6. FileEditorコンポーネント統合

**ファイル**: `src/components/layout/dashboard/editor/FileEditor.tsx`

```typescript
export function FileEditor({ owner, repo }: FileEditorProps) {
  const { saveFile, isSaving } = useSaveFile()
  const { setIsModified, setCurrentFileSha } = useEditorStore()
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)

  // ファイル取得時にSHAを保存
  useEffect(() => {
    if (fileData?.sha) {
      setCurrentFileSha(fileData.sha)
    }
  }, [fileData?.sha])

  // エディタの変更を検知
  const handleUpdate = ({ editor }: { editor: Editor }) => {
    setIsModified(true)
  }

  // 保存イベントリスナー
  useEffect(() => {
    const handleSave = () => {
      if (editorInstance && owner && repo) {
        const content = editorInstance.getJSON()
        saveFile(content, owner, repo)
      }
    }

    window.addEventListener('editor:save', handleSave)
    return () => window.removeEventListener('editor:save', handleSave)
  }, [editorInstance, owner, repo, saveFile])

  return (
    <EditorContent
      extensions={getEditorExtensions()}
      onUpdate={handleUpdate}
      onCreate={({ editor }) => setEditorInstance(editor)}
      // ...
    />
  )
}
```

### 7. Saveボタン追加

**ファイル**: `src/components/layout/dashboard/DashboardHeader.tsx`

```typescript
export function DashboardHeader() {
  const { isModified } = useEditorStore()

  const handleSave = () => {
    window.dispatchEvent(new CustomEvent('editor:save'))
  }

  return (
    <header>
      {/* 既存のコンテンツ */}

      <button
        onClick={handleSave}
        disabled={!isModified}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${
          isModified
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Save className="w-4 h-4" />
        <span>Save</span>
        <span className="text-xs opacity-70">⌘S</span>
      </button>
    </header>
  )
}
```

## エッジケース対応

### 1. 保存中の編集防止

```typescript
// isSavingフラグで保存中は再保存を防止
if (isSaving) return
```

### 2. 競合検出

```typescript
// GitHubのSHAチェックで競合を検知
// 409 Conflictエラーが返る場合、ファイルが更新されている
if (response.status === 409) {
  toast.error('ファイルが他で更新されています。リロードしてください。')
}
```

### 3. ネットワークエラー

```typescript
// リトライ機能
const saveWithRetry = async (retries = 3) => {
  try {
    await saveFile()
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await saveWithRetry(retries - 1)
    } else {
      throw error
    }
  }
}
```

### 4. 未保存警告

```typescript
// ページ離脱時の警告
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isModified) {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [isModified])
```

## UI/UX考慮

### 保存状態の可視化

1. **未保存**: ファイル名に `*` マーク表示
2. **保存中**: Saveボタンにスピナー表示
3. **保存完了**: チェックマークアニメーション + トースト

```typescript
<span className="ml-1">
  {isModified && '*'}
  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
</span>
```

### キーボードショートカット表示

- Saveボタンにツールチップで `Cmd+S` を表示
- ヘルプメニューにショートカット一覧

## 実装順序

1. ✅ **ステップ1**: エディタストアの拡張
2. ✅ **ステップ2**: Markdown変換ユーティリティ
3. ✅ **ステップ3**: GitHub API作成
4. ✅ **ステップ4**: キーボードショートカット拡張
5. ✅ **ステップ5**: 保存処理フック
6. ✅ **ステップ6**: FileEditorコンポーネント統合
7. ✅ **ステップ7**: Saveボタン追加
8. ✅ **ステップ8**: エッジケース対応
9. ✅ **ステップ9**: UI/UX改善

## 参考リンク

- [GitHub REST API - Update a file](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)
- [TipTap - JSON to HTML](https://tiptap.dev/guide/output#option-1-json)
- [Octokit.js](https://github.com/octokit/octokit.js)

## 備考

- 自動保存機能は今回のスコープ外（将来的に追加検討）
- 複数ファイル同時編集は未対応
- コンフリクト解決UIは将来的に追加予定
