# 54_DRAG_DROP_FEATURES_DETAILED.md

ドラッグ&ドロップ機能の詳細仕様書

## 概要

VSCode風ファイルツリーのドラッグ&ドロップ機能として実装すべき項目の詳細説明。
現在はダミーデータで基本的な移動機能を実装済み。実際のGitHubデータ移行後に以下の機能を追加実装予定。

---

## 必須機能

### 1. ドラッグ中の視覚的フィードバック強化

**現状**: 青いハイライトのみ

**追加内容**:

#### 1.1 ドロップ境界線
ドロップ可能な位置に青い線（1-2px）を表示

- **ファイルの上にドラッグ** → ファイルの上に線
- **ファイルの下にドラッグ** → ファイルの下に線
- **フォルダの上にドラッグ** → フォルダ内に入ることを示す（現在の青背景でOK）

```tsx
// 実装例
<div className="relative">
  {showDropIndicator === 'before' && (
    <div className="absolute -top-px left-0 right-0 h-0.5 bg-blue-500" />
  )}
  <FileTreeItem {...props} />
  {showDropIndicator === 'after' && (
    <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-blue-500" />
  )}
</div>
```

#### 1.2 ドロップ不可のフィードバック

以下の場合にカーソルを🚫マークに変更:
- 自分自身にドロップ
- 子フォルダに親フォルダをドロップ

```tsx
const isDragDisabled =
  active.id === over.id ||
  (activeNode.type === 'dir' && overNode.fullPath.startsWith(activeNode.fullPath + '/'))

<div style={{ cursor: isDragDisabled ? 'not-allowed' : 'grab' }}>
```

#### 1.3 ドロップ位置インジケーター

```
test1/
  test1-1.txt
  ← ここにドロップ（before）
  test1-2.txt
  ← ここにドロップ（after）
test2/ ← この中にドロップ（inside）
```

**実装**: `@dnd-kit/core`の`over`イベントから垂直位置を判定

---

### 2. 複数選択してドラッグ

**現状**: 1つずつしか移動できない

**追加内容**:

#### 2.1 複数選択UI

- **Ctrl/Cmd+クリック** → チェックボックス表示または背景色変更
- **Shift+クリック** → 範囲選択
- **選択数表示**: "3個のアイテムを選択中"

```tsx
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

const handleItemClick = (path: string, e: React.MouseEvent) => {
  if (e.ctrlKey || e.metaKey) {
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  } else if (e.shiftKey) {
    // 範囲選択ロジック
  }
}
```

#### 2.2 一括ドラッグ

- 選択した複数ファイルを同時に移動
- ドラッグオーバーレイに「test1-1.txt他2件」と表示
- 内部的には選択したすべてのアイテムに対して`moveItems`を実行

```tsx
const handleDragStart = (event: DragStartEvent) => {
  const draggedPath = event.active.id as string
  if (!selectedItems.has(draggedPath)) {
    setSelectedItems(new Set([draggedPath]))
  }
  setActiveId(draggedPath)
}

const handleDragEnd = (event: DragEndEvent) => {
  // selectedItemsの全アイテムを移動
  selectedItems.forEach(itemPath => {
    const node = flatTree.find(n => n.fullPath === itemPath)
    if (node) {
      const updatedTree = moveItems(fileTree, node, targetPath)
      setFileTree(updatedTree)
    }
  })
}
```

#### 2.3 ドラッグオーバーレイ表示

```tsx
<DragOverlay>
  {selectedItems.size > 1 ? (
    <div className="flex items-center gap-2 px-2 py-1 bg-white shadow-lg rounded">
      <File className="h-4 w-4" />
      <span>{activeNode?.name} 他{selectedItems.size - 1}件</span>
    </div>
  ) : (
    // 単一アイテム表示
  )}
</DragOverlay>
```

---

### 3. ファイル/フォルダの並び替え（同一階層内）

**現状**: VSCode風の自動ソート（名前順）のみ

**追加内容**:

#### 3.1 カスタム順序モード

トグルボタンで「名前順」⇔「手動順」切り替え

```tsx
const [sortMode, setSortMode] = useState<'name' | 'manual'>('name')

<button onClick={() => setSortMode(prev => prev === 'name' ? 'manual' : 'name')}>
  {sortMode === 'name' ? '📝 手動順に切替' : '🔤 名前順に切替'}
</button>
```

#### 3.2 同一階層内での並び替え

手動順モードでは、同じディレクトリ内でファイルの順序を自由に変更可能

```tsx
const handleDragEnd = (event: DragEndEvent) => {
  if (sortMode === 'manual' && isSameDirectory(activeNode, overNode)) {
    // 配列の並び替え
    const newOrder = [...fileTree]
    const oldIndex = fileTree.findIndex(f => f.path === activeNode.fullPath)
    const newIndex = fileTree.findIndex(f => f.path === overNode.fullPath)

    const [removed] = newOrder.splice(oldIndex, 1)
    newOrder.splice(newIndex, 0, removed)

    setFileTree(newOrder)
  }
}
```

#### 3.3 使用例

- よく使うファイルを上に配置
- 関連ファイルをグループ化
- README → package.json → src/ の順序など

---

### 4. ドラッグ中のスクロール ⭐最優先

**現状**: ツリーが長い場合、ドラッグしたまま下にスクロールできない

**追加内容**:

#### 4.1 自動スクロール発動条件

- **上端から50px以内** → 上にスクロール
- **下端から50px以内** → 下にスクロール
- **スクロール速度**: カーソルが端に近いほど速く

```tsx
const containerRef = useRef<HTMLDivElement>(null)
const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null)

const handleDragMove = (event: DragMoveEvent) => {
  const container = containerRef.current
  if (!container) return

  const rect = container.getBoundingClientRect()
  const y = event.activatorEvent.clientY

  const threshold = 50
  const edgeDistance = Math.min(
    y - rect.top,
    rect.bottom - y
  )

  if (y < rect.top + threshold) {
    // 上スクロール
    const speed = Math.max(1, (threshold - edgeDistance) / 10)
    startAutoScroll(-speed)
  } else if (y > rect.bottom - threshold) {
    // 下スクロール
    const speed = Math.max(1, (threshold - edgeDistance) / 10)
    startAutoScroll(speed)
  } else {
    stopAutoScroll()
  }
}

const startAutoScroll = (speed: number) => {
  stopAutoScroll()
  scrollIntervalRef.current = setInterval(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop += speed
    }
  }, 16) // 60fps
}

const stopAutoScroll = () => {
  if (scrollIntervalRef.current) {
    clearInterval(scrollIntervalRef.current)
    scrollIntervalRef.current = null
  }
}

useEffect(() => {
  return () => stopAutoScroll()
}, [])
```

#### 4.2 必要な理由

- 100個以上のファイルがある場合、一番下のフォルダに移動するのが困難
- ドラッグを中断せずに目的地まで移動可能
- VSCodeでも実装されている標準機能

---

### 5. ドラッグ中のディレクトリ自動展開 ⭐優先度高

**現状**: 閉じたフォルダにドロップすると中に入るが、事前に確認できない

**追加内容**:

#### 5.1 ホバー自動展開

- 閉じたフォルダの上で**1秒ホバー** → 自動的に展開
- 展開後も中の子フォルダでさらにホバー → 連続展開可能
- 深い階層（例: `src/components/features/editor/`）への移動が楽に

```tsx
const [hoverTimers, setHoverTimers] = useState<Map<string, NodeJS.Timeout>>(new Map())

const handleDragOver = (event: DragOverEvent) => {
  const overId = event.over?.id as string
  if (!overId) {
    clearAllHoverTimers()
    return
  }

  const overNode = flatTree.find(n => n.fullPath === overId)

  if (overNode?.type === 'dir' && !localExpandedDirs.has(overId)) {
    // 既に同じディレクトリのタイマーがある場合は何もしない
    if (hoverTimers.has(overId)) return

    // 他のタイマーをクリア
    clearAllHoverTimers()

    // 1秒後に展開
    const timer = setTimeout(() => {
      setLocalExpandedDirs(prev => new Set(prev).add(overId))
      setHoverTimers(new Map())
    }, 1000)

    setHoverTimers(new Map([[overId, timer]]))
  } else {
    clearAllHoverTimers()
  }
}

const clearAllHoverTimers = () => {
  hoverTimers.forEach(timer => clearTimeout(timer))
  setHoverTimers(new Map())
}

useEffect(() => {
  return () => clearAllHoverTimers()
}, [])
```

#### 5.2 視覚的フィードバック

ホバー中はプログレスバーまたはアニメーションを表示

```tsx
{hoverTimers.has(node.fullPath) && (
  <div className="absolute inset-0 pointer-events-none">
    <div className="h-full bg-blue-500/20 animate-expand-width" />
  </div>
)}
```

```css
@keyframes expand-width {
  from { width: 0%; }
  to { width: 100%; }
}

.animate-expand-width {
  animation: expand-width 1s linear;
}
```

#### 5.3 VSCodeでの動作

VSCodeでファイルをドラッグして閉じたフォルダの上でじっと待つと、約1秒後に自動展開される

---

### 6. アンドゥ/リドゥ

**現状**: 間違えて移動すると手動で戻す必要がある

**追加内容**:

#### 6.1 操作履歴の記録

```tsx
interface HistoryEntry {
  action: 'move' | 'copy' | 'rename' | 'delete' | 'create'
  timestamp: number
  before: {
    fileTree: FileTreeItem[]
    emptyDirectories: Set<string>
    expandedDirs: Set<string>
  }
  after: {
    fileTree: FileTreeItem[]
    emptyDirectories: Set<string>
    expandedDirs: Set<string>
  }
}

const [history, setHistory] = useState<HistoryEntry[]>([])
const [historyIndex, setHistoryIndex] = useState(-1)

const addToHistory = (action: HistoryEntry['action'], before: HistoryEntry['before'], after: HistoryEntry['after']) => {
  const newEntry: HistoryEntry = {
    action,
    timestamp: Date.now(),
    before,
    after
  }

  // 現在位置より後の履歴を削除
  const newHistory = history.slice(0, historyIndex + 1)
  newHistory.push(newEntry)

  // 履歴の最大数を50に制限
  if (newHistory.length > 50) {
    newHistory.shift()
  }

  setHistory(newHistory)
  setHistoryIndex(newHistory.length - 1)
}
```

#### 6.2 アンドゥ/リドゥ実装

```tsx
const undo = () => {
  if (historyIndex < 0) return

  const entry = history[historyIndex]
  setFileTree(entry.before.fileTree)
  setEmptyDirectories(entry.before.emptyDirectories)
  setLocalExpandedDirs(entry.before.expandedDirs)
  setHistoryIndex(prev => prev - 1)
}

const redo = () => {
  if (historyIndex >= history.length - 1) return

  const entry = history[historyIndex + 1]
  setFileTree(entry.after.fileTree)
  setEmptyDirectories(entry.after.emptyDirectories)
  setLocalExpandedDirs(entry.after.expandedDirs)
  setHistoryIndex(prev => prev + 1)
}

useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault()
      undo()
    } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
      e.preventDefault()
      redo()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [historyIndex, history])
```

#### 6.3 handleDragEndに履歴記録を追加

```tsx
const handleDragEnd = (event: DragEndEvent) => {
  // ... 移動処理 ...

  // 移動前の状態を保存
  const beforeState = {
    fileTree: [...fileTree],
    emptyDirectories: new Set(emptyDirectories),
    expandedDirs: new Set(localExpandedDirs)
  }

  // 移動実行
  const updatedFileTree = moveItems(fileTree, activeNode, newBasePath)
  setFileTree(updatedFileTree)

  // 移動後の状態を保存
  const afterState = {
    fileTree: updatedFileTree,
    emptyDirectories: new Set(emptyDirectories),
    expandedDirs: new Set(localExpandedDirs)
  }

  // 履歴に追加
  addToHistory('move', beforeState, afterState)
}
```

#### 6.4 使用例

1. test1フォルダをtest2に移動
2. やっぱり間違えた → **Ctrl+Z** → test1が元の位置に戻る
3. やっぱり移動したい → **Ctrl+Shift+Z** → test1がtest2に移動

---

### 7. ドラッグキャンセル ⭐優先度高

**現状**: ドラッグ開始したら必ずドロップする必要がある

**追加内容**:

#### 7.1 Escキーでキャンセル

```tsx
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && activeId) {
      e.preventDefault()
      setActiveId(null)
      setOverId(null)
      stopAutoScroll() // 自動スクロールも停止
      clearAllHoverTimers() // ホバータイマーもクリア
    }
  }

  window.addEventListener('keydown', handleEscape)
  return () => window.removeEventListener('keydown', handleEscape)
}, [activeId])
```

#### 7.2 使用例

1. test1をドラッグ開始
2. あ、やっぱりやめた → **Esc** → 何も起こらず元の状態に

#### 7.3 実装の容易さ

- わずか10行程度で実装可能
- UX向上効果が大きい
- VSCodeでも標準実装

---

### 8. コピーモード

**現状**: ドラッグ&ドロップは常に「移動」

**追加内容**:

#### 8.1 Ctrl/Cmd押しながらドラッグでコピー

```tsx
const [isCopyMode, setIsCopyMode] = useState(false)

const handleDragMove = (event: DragMoveEvent) => {
  const isCtrlPressed = event.activatorEvent?.ctrlKey || event.activatorEvent?.metaKey
  setIsCopyMode(!!isCtrlPressed)
}

const handleDragEnd = (event: DragEndEvent) => {
  // ... 移動先計算 ...

  if (isCopyMode) {
    // コピー処理
    copyItems(fileTree, activeNode, newBasePath)
  } else {
    // 移動処理（現在の実装）
    moveItems(fileTree, activeNode, newBasePath)
  }

  setIsCopyMode(false)
}
```

#### 8.2 コピー処理実装

```tsx
function copyItems(
  fileTree: FileTreeItem[],
  activeNode: TreeNode,
  newBasePath: string
): FileTreeItem[] {
  const newFileTree = [...fileTree]

  // コピー対象アイテムを取得
  const itemsToCopy = newFileTree.filter(
    (item) =>
      item.path === activeNode.fullPath ||
      item.path.startsWith(activeNode.fullPath + '/')
  )

  // コピー先のパス名を生成（重複チェック）
  const copyName = generateCopyName(activeNode.name, newBasePath, newFileTree)
  const finalBasePath = newBasePath.replace(activeNode.name, copyName)

  // コピーを追加
  const copiedItems = itemsToCopy.map((item) => {
    const relativePath = item.path.substring(activeNode.fullPath.length)
    return {
      ...item,
      path: finalBasePath + relativePath,
      sha: generateNewSha() // 新しいSHAを生成
    }
  })

  return [...newFileTree, ...copiedItems].sort((a, b) =>
    a.path.localeCompare(b.path)
  )
}

function generateCopyName(
  originalName: string,
  targetDir: string,
  fileTree: FileTreeItem[]
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '') // 拡張子を除く
  const extension = originalName.match(/\.[^/.]+$/)?.[0] || ''

  let copyName = `${baseName} copy${extension}`
  let counter = 2

  // 重複チェック
  while (fileTree.some(f => f.path === `${targetDir}/${copyName}`)) {
    copyName = `${baseName} copy ${counter}${extension}`
    counter++
  }

  return copyName
}
```

#### 8.3 視覚的フィードバック

```tsx
<DragOverlay>
  {activeNode && (
    <div className="relative flex items-center gap-2 px-2 py-1 bg-white shadow-lg rounded">
      {/* アイコンとファイル名 */}
      {isCopyMode && (
        <span className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
          +
        </span>
      )}
    </div>
  )}
</DragOverlay>
```

#### 8.4 コピー名の付け方

- `test1-1.txt` → `test1-1 copy.txt`
- 既に存在する場合 → `test1-1 copy 2.txt`, `test1-1 copy 3.txt`...
- フォルダの場合 → `test1` → `test1 copy`

---

### 9. ドラッグ禁止設定

**現状**: すべてのファイル/フォルダがドラッグ可能

**追加内容**:

#### 9.1 移動不可パターンの定義

```tsx
const IMMOVABLE_PATTERNS = [
  /^\.git(\/|$)/,
  /^node_modules(\/|$)/,
  /^\.next(\/|$)/,
  /^\.env/,
  /^package\.json$/,
  /^package-lock\.json$/,
  /^yarn\.lock$/,
] as const

const isImmovable = (path: string): boolean => {
  return IMMOVABLE_PATTERNS.some(pattern => pattern.test(path))
}
```

#### 9.2 ドラッグ開始の阻止

```tsx
const handleDragStart = (event: DragStartEvent) => {
  const draggedPath = event.active.id as string

  if (isImmovable(draggedPath)) {
    event.preventDefault() // ドラッグ開始を阻止
    toast.error('このファイルは移動できません')
    return
  }

  setActiveId(draggedPath)
}
```

#### 9.3 視覚的表示

```tsx
function SortableItem({ node, ... }: SortableItemProps) {
  const immovable = isImmovable(node.fullPath)
  const { attributes, listeners, ... } = useSortable({
    id: node.fullPath,
    disabled: immovable // ドラッグ無効化
  })

  return (
    <div>
      <div className={`flex items-center gap-1 ${immovable ? 'opacity-50' : ''}`}>
        {immovable ? (
          <Lock className="h-4 w-4 text-gray-400" />
        ) : (
          <button {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        {/* ... */}
      </div>
    </div>
  )
}
```

#### 9.4 保護対象

- **.git/** - Gitリポジトリメタデータ
- **node_modules/** - 依存パッケージ
- **.next/** - Next.jsビルドキャッシュ
- **.env**, **.env.local** - 環境変数ファイル
- **package.json** - パッケージ設定
- **package-lock.json**, **yarn.lock** - ロックファイル

---

### 10. ドロップ前の確認ダイアログ

**現状**: ドロップすると即座に移動される

**追加内容**:

#### 10.1 確認が必要なケース

1. **大量ファイル**: 10個以上のファイルを含むフォルダを移動
2. **重要フォルダ**: src, components, lib等への移動
3. **名前衝突**: 移動先に同名のファイル/フォルダが存在

```tsx
const IMPORTANT_DIRS = ['src', 'components', 'lib', 'utils', 'pages', 'app']

const needsConfirmation = (
  activeNode: TreeNode,
  targetPath: string,
  fileTree: FileTreeItem[]
): { needed: boolean; reason: string } => {
  // 大量ファイルチェック
  const childCount = fileTree.filter(f =>
    f.path.startsWith(activeNode.fullPath + '/')
  ).length

  if (childCount >= 10) {
    return {
      needed: true,
      reason: `${childCount}個のファイルを移動しようとしています`
    }
  }

  // 重要フォルダチェック
  const targetDir = targetPath.split('/')[0]
  if (IMPORTANT_DIRS.includes(targetDir)) {
    return {
      needed: true,
      reason: `重要なディレクトリ "${targetDir}" に移動しようとしています`
    }
  }

  // 名前衝突チェック
  const alreadyExists = fileTree.some(f => f.path === targetPath)
  if (alreadyExists) {
    return {
      needed: true,
      reason: `同名のファイル/フォルダが既に存在します`
    }
  }

  return { needed: false, reason: '' }
}
```

#### 10.2 確認ダイアログの実装

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const [confirmDialog, setConfirmDialog] = useState<{
  open: boolean
  title: string
  message: string
  onConfirm: () => void
} | null>(null)

const handleDragEnd = async (event: DragEndEvent) => {
  // ... 移動先計算 ...

  const confirmation = needsConfirmation(activeNode, newBasePath, fileTree)

  if (confirmation.needed) {
    // 確認ダイアログを表示
    setConfirmDialog({
      open: true,
      title: '移動の確認',
      message: confirmation.reason,
      onConfirm: () => {
        executeMoveOperation(activeNode, newBasePath)
        setConfirmDialog(null)
      }
    })
    return
  }

  // 確認不要な場合は即座に実行
  executeMoveOperation(activeNode, newBasePath)
}

// ダイアログコンポーネント
{confirmDialog && (
  <Dialog open={confirmDialog.open} onOpenChange={() => setConfirmDialog(null)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <p className="text-sm text-gray-600">{confirmDialog.message}</p>
        <p className="mt-2 text-sm">本当に移動しますか？</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setConfirmDialog(null)}>
          キャンセル
        </Button>
        <Button onClick={confirmDialog.onConfirm}>
          移動する
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

#### 10.3 ダイアログ表示例

```
┌─────────────────────────────────────┐
│ 📁 移動の確認                        │
├─────────────────────────────────────┤
│                                     │
│ 15個のファイルを移動しようとして    │
│ います。                             │
│                                     │
│ test1/ → test2/test1               │
│                                     │
│ 本当に移動しますか？                 │
│                                     │
│           [キャンセル]  [移動する]    │
└─────────────────────────────────────┘
```

---

## 実装優先順位

### 最優先（必須）
1. **4. ドラッグ中のスクロール** - 大量ファイル時に必須
2. **1. 視覚的フィードバック強化** - UXの基本
3. **5. ディレクトリ自動展開** - 深い階層への移動が楽に
4. **7. ドラッグキャンセル** - 実装が簡単で効果大

### 優先度高
5. **6. アンドゥ/リドゥ** - 誤操作の救済
6. **2. 複数選択** - 実装コスト高いが便利

### あると便利
7. **8. コピーモード** - ユーザーの選択肢を増やす
8. **9. ドラッグ禁止設定** - システムファイル保護
9. **10. 確認ダイアログ** - 重要な操作の安全性向上
10. **3. 並び替え** - カスタマイズ性向上

---

## 実装スケジュール案

### Phase 1: 基本UX向上（1-2日）
- [x] 基本的なドラッグ&ドロップ（実装済み）
- [ ] 4. ドラッグ中のスクロール
- [ ] 1. 視覚的フィードバック強化
- [ ] 7. ドラッグキャンセル

### Phase 2: 高度な機能（2-3日）
- [ ] 5. ディレクトリ自動展開
- [ ] 6. アンドゥ/リドゥ
- [ ] 2. 複数選択してドラッグ

### Phase 3: 追加機能（1-2日）
- [ ] 8. コピーモード
- [ ] 9. ドラッグ禁止設定
- [ ] 10. 確認ダイアログ

### Phase 4: 最適化（オプション）
- [ ] 3. 同一階層内並び替え
- [ ] パフォーマンス最適化
- [ ] アクセシビリティ対応

---

## 技術スタック

- **@dnd-kit/core** - ドラッグ&ドロップコア機能
- **@dnd-kit/sortable** - ソート可能リスト
- **React Hooks** - useState, useEffect, useCallback, useMemo
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Lucide React** - アイコン

---

## 参考リンク

- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [VSCode File Explorer UX](https://code.visualstudio.com/docs/getstarted/userinterface)
- [React DnD Examples](https://react-dnd.github.io/react-dnd/examples)

---

## 備考

- 現在はダミーデータで動作確認中
- GitHubデータ移行後、実際のファイル操作APIと連携
- Supabaseへの状態保存も検討
- モバイル対応（タッチデバイス）も将来的に実装予定
