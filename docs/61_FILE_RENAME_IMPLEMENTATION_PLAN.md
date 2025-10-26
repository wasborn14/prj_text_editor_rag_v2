# ファイル・ディレクトリ名称変更機能 実装プラン

## 概要

ファイルツリー内のファイル・ディレクトリを右クリック（PC）または長押し（SP）で名称変更できる機能を実装する。

## ユーザー体験

### PC（デスクトップ）
- ファイル/ディレクトリを**右クリック**
- コンテキストメニューが表示される
  - 「Rename」オプションを選択
- インライン編集モードに切り替わり、テキスト入力可能に
- Enter: 確定、Esc: キャンセル

### SP（モバイル）
- ファイル/ディレクトリを**長押し**（500ms程度）
- コンテキストメニューが表示される
  - 「Rename」オプションを選択
- インライン編集モードに切り替わり、テキスト入力可能に
- チェックマーク: 確定、×ボタン: キャンセル

## 技術設計

### 1. コンポーネント構造

#### FileTreeItem.tsx の拡張
```typescript
interface FileTreeItemProps {
  // 既存props
  node: TreeNode
  isExpanded: boolean
  isSelected: boolean
  onToggle: () => void
  onItemClick: () => void
  isDragOver: boolean
  isInDragOverDirectory: boolean

  // 新規追加
  isRenaming?: boolean
  onRenameStart?: (path: string) => void
  onRenameComplete?: (oldPath: string, newPath: string) => Promise<void>
  onRenameCancel?: () => void
}
```

#### ContextMenu.tsx（新規作成）
```typescript
interface ContextMenuProps {
  x: number
  y: number
  isOpen: boolean
  onClose: () => void
  items: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
    disabled?: boolean
  }>
}
```

#### RenameInput.tsx（新規作成）
```typescript
interface RenameInputProps {
  initialValue: string
  onConfirm: (newName: string) => void
  onCancel: () => void
  autoFocus: boolean
}
```

### 2. State管理

#### FileTreePanel.tsx に追加
```typescript
const [contextMenu, setContextMenu] = useState<{
  x: number
  y: number
  path: string
} | null>(null)

const [renamingPath, setRenamingPath] = useState<string | null>(null)
```

### 3. GitHub API連携

#### GitHubClient.ts に追加メソッド
```typescript
/**
 * ファイルまたはディレクトリの名称変更
 * 内部的にはmoveFilesを使用（パスの変更として扱う）
 */
async renameFileOrDirectory(
  owner: string,
  repo: string,
  oldPath: string,
  newPath: string,
  isDirectory: boolean,
  currentTree: FileTreeItem[],
  branch?: string
): Promise<string>
```

### 4. イベントハンドリング

#### 右クリック（PC）
```typescript
const handleContextMenu = (e: React.MouseEvent, node: TreeNode) => {
  e.preventDefault()
  e.stopPropagation()

  setContextMenu({
    x: e.clientX,
    y: e.clientY,
    path: node.fullPath
  })
}
```

#### 長押し（SP）
```typescript
const handleTouchStart = (e: React.TouchEvent, node: TreeNode) => {
  const timeoutId = setTimeout(() => {
    const touch = e.touches[0]
    setContextMenu({
      x: touch.clientX,
      y: touch.clientY,
      path: node.fullPath
    })
  }, 500) // 500ms長押し

  // touchend/touchmoveでクリア
}
```

### 5. バリデーション

#### 名称変更時のチェック項目
- 空文字列の禁止
- `/` を含む名前の禁止
- `.` または `..` の禁止
- 既存ファイル/ディレクトリとの重複チェック
- 同じ階層に同名ファイルがないか確認

```typescript
function validateNewName(
  newName: string,
  parentPath: string,
  fileTree: FileTreeItem[]
): { valid: boolean; error?: string } {
  if (!newName.trim()) {
    return { valid: false, error: '名前を入力してください' }
  }

  if (newName.includes('/')) {
    return { valid: false, error: '名前に「/」を含めることはできません' }
  }

  if (newName === '.' || newName === '..') {
    return { valid: false, error: '「.」または「..」は使用できません' }
  }

  const newPath = parentPath ? `${parentPath}/${newName}` : newName
  const exists = fileTree.some(item => item.path === newPath)

  if (exists) {
    return { valid: false, error: 'その名前は既に使用されています' }
  }

  return { valid: true }
}
```

### 6. ディレクトリ名称変更の特別処理

ディレクトリを名称変更する場合、配下の全ファイルのパスも更新が必要：

```typescript
function getAffectedPaths(
  oldPath: string,
  newPath: string,
  fileTree: FileTreeItem[]
): Array<{ oldPath: string; newPath: string }> {
  return fileTree
    .filter(item => item.path === oldPath || item.path.startsWith(oldPath + '/'))
    .map(item => ({
      oldPath: item.path,
      newPath: item.path.replace(oldPath, newPath)
    }))
}
```

## 実装ステップ

### Phase 1: UI基盤
1. ✅ `ContextMenu.tsx` コンポーネント作成
2. ✅ `RenameInput.tsx` コンポーネント作成
3. ✅ `FileTreeItem.tsx` に右クリック/長押しイベント追加

### Phase 2: ロジック実装
4. ✅ `GitHubClient.renameFileOrDirectory()` メソッド追加
5. ✅ バリデーション関数の実装
6. ✅ ディレクトリ配下のパス更新ロジック

### Phase 3: 統合とテスト
7. ✅ `FileTreePanel.tsx` で全体を統合
8. ✅ エラーハンドリングとトースト通知
9. ✅ ローカルState（fileTree）の即座更新
10. ✅ 動作テスト（PC/SP両方）

## エラーハンドリング

### 想定されるエラー
- GitHub API エラー（権限不足、ネットワークエラー）
- 名前の重複
- 不正な文字列
- ブランチの競合（同時編集）

### ユーザーへの通知
```typescript
// 成功時
toast.success(`"${oldName}" を "${newName}" に変更しました`)

// エラー時
toast.error(`名称変更に失敗しました: ${error.message}`)
```

## UIデザイン

### コンテキストメニュー
```
┌─────────────────┐
│ ✏️ Rename       │
│ 🗑️ Delete       │  <- 将来実装
│ 📋 Duplicate    │  <- 将来実装
└─────────────────┘
```

### リネーム中の表示（PC）
```
📄 [oldName.txt    ]  <- input field
   Press Enter to confirm, Esc to cancel
```

### リネーム中の表示（SP）
```
📄 [newName.txt] ✓ ✕
```

## パフォーマンス考慮

- インライン編集中はドラッグ&ドロップを無効化
- コンテキストメニューは外側クリックで自動クローズ
- リネーム完了後、自動的にファイルツリーを再フェッチ（最新状態を反映）

## セキュリティ

- ユーザー入力のサニタイズ（XSS対策）
- GitHub token の適切な管理
- RLS（Row Level Security）によるSupabase上のアクセス制御

## 今後の拡張可能性

- 複数選択時の一括リネーム
- ファイル削除機能
- ファイル複製機能
- ファイル新規作成機能
- ドラッグ&ドロップによるリネーム（ドロップ先の名前を編集）
