# ドラッグ&ドロップ実装プラン

## 概要

ファイルツリー（サイドバー）でファイルやフォルダをドラッグ&ドロップで移動できる機能を追加します。

## 1. ライブラリ選定

### 推奨: @dnd-kit/core + @dnd-kit/sortable

**選定理由:**
- ✅ モダンで軽量（~20KB gzipped）
- ✅ モバイル/タッチ対応が標準装備
- ✅ アクセシビリティ対応（キーボード操作可能）
- ✅ React 18+、TypeScript完全対応
- ✅ カスタマイズ性が高い
- ✅ アニメーション制御が容易

**代替案との比較:**
| ライブラリ | サイズ | モバイル | アクセシビリティ | メンテナンス |
|-----------|--------|---------|----------------|------------|
| @dnd-kit | ~20KB | ✅ | ✅ | ✅ 活発 |
| react-dnd | ~45KB | 追加実装必要 | ❌ | 🔶 やや停滞 |
| HTML5 API | 0KB | ❌ タッチ未対応 | ❌ | - |

## 2. 基本仕様

### 2.1 ドラッグ可能な要素
- ✅ ファイル → フォルダへ移動
- ✅ フォルダ → 別フォルダへ移動
- ✅ 複数選択 → まとめて移動（将来対応）

### 2.2 ドロップ可能な場所
- ✅ フォルダ（展開/未展開問わず）
- ✅ ルートディレクトリ
- ❌ ファイルへのドロップは不可

### 2.3 制約事項
- 親フォルダを子フォルダ内に移動することは不可（循環参照防止）
- 同じフォルダ内での移動は無視
- ドット付きファイル/フォルダも移動可能

## 3. UI/UX デザイン

### 3.1 デスクトップ（マウス操作）

```typescript
// ドラッグ中の表示
<div className="opacity-50 cursor-grabbing">
  {/* ドラッグ元のファイル */}
</div>

// ドロップ可能なフォルダ
<div className="bg-blue-100 border-2 border-blue-400 border-dashed">
  {/* ドロップ先のフォルダ */}
</div>

// ドロップ不可の場所
<div className="opacity-30 cursor-not-allowed">
  {/* 無効なドロップ先 */}
</div>
```

**視覚的フィードバック:**
1. ドラッグ開始: カーソルが `grabbing` に変化、元要素が半透明
2. ホバー中: ドロップ先フォルダが青いハイライト + 点線枠
3. 無効な場所: 赤い禁止マーク + カーソルが `not-allowed`
4. ドロップ時: 短いフェードアウトアニメーション

### 3.2 モバイル（タッチ操作）

```typescript
// 長押しでドラッグ開始（500ms）
const sensors = useSensors(
  useSensor(MouseSensor),
  useSensor(TouchSensor, {
    activationConstraint: {
      delay: 500,        // 長押し時間
      tolerance: 5       // 移動許容範囲（px）
    }
  })
)
```

**モバイル特有の対応:**
1. 500ms長押しでドラッグ開始
2. ハプティックフィードバック（振動）
3. ドラッグ中は画面スクロール無効化
4. ドロップ先フォルダを大きめ（44px以上のタップ領域）
5. ドラッグ中のプレビュー表示を最適化

## 4. 実装アーキテクチャ

### 4.1 ファイル構成

```
frontend/src/
├── hooks/
│   ├── useDragDrop.ts          # ドラッグ&ドロップロジック
│   └── useMoveFile.ts          # ファイル移動API呼び出し
├── components/
│   ├── organisms/Sidebar/
│   │   ├── FileTreeItem.tsx    # 修正: ドラッグ&ドロップ対応
│   │   └── DraggableFileItem.tsx  # 新規: ラッパーコンポーネント
│   └── molecules/
│       └── DropZoneIndicator.tsx  # 新規: ドロップゾーン表示
└── app/api/github/
    └── move-file/
        └── route.ts            # 新規: ファイル移動API
```

### 4.2 主要コンポーネント

#### `useDragDrop.ts` - カスタムフック
```typescript
interface DragDropOptions {
  onMove: (from: string, to: string, type: 'file' | 'dir') => Promise<void>
  validateDrop: (draggable: FileTreeNode, droppable: FileTreeNode) => boolean
}

export function useDragDrop(files: FileTreeNode[], options: DragDropOptions) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 500, tolerance: 5 } })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggable = findNode(files, active.id as string)
    const droppable = findNode(files, over.id as string)

    if (!draggable || !droppable || !options.validateDrop(draggable, droppable)) {
      return
    }

    await options.onMove(draggable.path, droppable.path, draggable.type)
    setActiveId(null)
  }

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
    handleDragCancel: () => setActiveId(null)
  }
}
```

#### `DraggableFileItem.tsx` - ラッパーコンポーネント
```typescript
import { useDraggable, useDroppable } from '@dnd-kit/core'

export function DraggableFileItem({ node, children }: Props) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: node.path,
    data: node
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: node.path,
    disabled: node.type === 'file' // ファイルへのドロップは不可
  })

  // ドラッグとドロップの両方のrefを結合
  const combinedRef = useCallback((el: HTMLElement | null) => {
    setDragRef(el)
    setDropRef(el)
  }, [setDragRef, setDropRef])

  return (
    <div
      ref={combinedRef}
      {...attributes}
      {...listeners}
      className={cn(
        'transition-all duration-150',
        isDragging && 'opacity-50 cursor-grabbing',
        isOver && node.type === 'dir' && 'bg-blue-100 border-2 border-blue-400 border-dashed'
      )}
    >
      {children}
    </div>
  )
}
```

#### `useMoveFile.ts` - API呼び出しフック
```typescript
interface MoveFileParams {
  owner: string
  repo: string
  sourcePath: string
  targetPath: string  // 移動先フォルダのパス
  type: 'file' | 'dir'
}

export function useMoveFile() {
  const [isMoving, setIsMoving] = useState(false)

  const moveFile = async (params: MoveFileParams) => {
    setIsMoving(true)
    try {
      const response = await fetch('/api/github/move-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      })

      if (!response.ok) throw new Error('Failed to move file')
      return await response.json()
    } finally {
      setIsMoving(false)
    }
  }

  return { moveFile, isMoving }
}
```

### 4.3 バリデーションロジック

```typescript
function validateDrop(draggable: FileTreeNode, droppable: FileTreeNode): boolean {
  // 1. ファイルへのドロップは不可
  if (droppable.type === 'file') return false

  // 2. 自分自身へのドロップは不可
  if (draggable.path === droppable.path) return false

  // 3. 親フォルダを子フォルダ内に移動不可（循環参照防止）
  if (droppable.path.startsWith(draggable.path + '/')) return false

  // 4. 同じフォルダ内での移動は無視
  const draggableParent = draggable.path.substring(0, draggable.path.lastIndexOf('/'))
  if (draggableParent === droppable.path) return false

  return true
}
```

## 5. GitHub API統合

### 5.1 ファイル移動APIエンドポイント

```typescript
// app/api/github/move-file/route.ts
export async function POST(request: NextRequest) {
  const { owner, repo, sourcePath, targetPath, type } = await request.json()

  // 移動先のパスを構築
  const fileName = sourcePath.split('/').pop()
  const destinationPath = `${targetPath}/${fileName}`

  if (type === 'file') {
    // 1. ソースファイルの内容を取得
    const content = await getFileContent(owner, repo, sourcePath)

    // 2. 移動先に新規作成
    await createFile(owner, repo, destinationPath, content)

    // 3. ソースファイルを削除
    await deleteFile(owner, repo, sourcePath)
  } else {
    // フォルダの場合は再帰的に移動
    await moveDirectory(owner, repo, sourcePath, targetPath)
  }

  return NextResponse.json({ success: true, newPath: destinationPath })
}
```

### 5.2 コミットメッセージ

```typescript
const commitMessage = `Move ${type}: ${sourcePath} → ${destinationPath}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>`
```

## 6. Sidebar統合

```typescript
// Sidebar.tsx
import { DndContext, DragOverlay } from '@dnd-kit/core'

export function Sidebar({ files, repository, onRefresh }: Props) {
  const { moveFile } = useMoveFile()

  const { sensors, activeId, handleDragStart, handleDragEnd } = useDragDrop(files, {
    onMove: async (sourcePath, targetPath, type) => {
      if (!repository) return

      const result = await moveFile({
        owner: repository.owner,
        repo: repository.name,
        sourcePath,
        targetPath,
        type
      })

      if (result.success) {
        // エディタのタブパスを更新
        updateTabPath(sourcePath, result.newPath)

        // ファイルツリーを再取得
        onRefresh?.()
      }
    },
    validateDrop
  })

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SidebarContent files={files} />

      <DragOverlay>
        {activeId ? (
          <div className="bg-white shadow-lg rounded p-2">
            {/* ドラッグ中のプレビュー */}
            <FileTreeItem node={findNode(files, activeId)} preview />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
```

## 7. 段階的実装計画

### Week 1: 基本実装（デスクトップ）
- [ ] @dnd-kit インストール
- [ ] `useDragDrop` フック作成
- [ ] `DraggableFileItem` コンポーネント作成
- [ ] ファイルのドラッグ&ドロップ（フォルダへ）
- [ ] バリデーションロジック実装

### Week 2: API統合
- [ ] `/api/github/move-file` エンドポイント作成
- [ ] `useMoveFile` フック作成
- [ ] エディタタブの自動更新
- [ ] エラーハンドリングとローディング状態

### Week 3: フォルダ移動 & モバイル対応
- [ ] フォルダの再帰的移動
- [ ] タッチセンサー設定（長押し500ms）
- [ ] モバイル用の視覚的フィードバック
- [ ] ハプティックフィードバック（iOS/Android）

### Week 4: UX改善 & テスト
- [ ] アニメーション最適化
- [ ] キーボード操作対応（アクセシビリティ）
- [ ] ドラッグプレビューのカスタマイズ
- [ ] E2Eテスト作成

## 8. V1 vs V2 実装判断

### 推奨: V2で実装

**理由:**
1. ✅ V2は Container/Presenter パターンで設計済み → ロジック分離が容易
2. ✅ V2はモバイルファーストで設計 → タッチ操作が標準装備
3. ✅ V1に追加すると複雑度が増し、リファクタリング作業が増える
4. ✅ ドラッグ&ドロップはコア機能ではなく、リリース後追加でも問題なし

**V1への仮実装案（必要な場合のみ）:**
- 最小限の実装: ファイルのみ、フォルダは対象外
- デスクトップのみ、モバイルは未対応
- 簡易的なバリデーションのみ

## 9. 技術的考慮事項

### 9.1 パフォーマンス
- ファイル数が多い場合（1000+）は仮想スクロール（react-window）と併用
- ドラッグ中のレンダリング最適化（React.memo、useMemo）

### 9.2 アクセシビリティ
- キーボード操作: Space/Enter でドラッグ開始、矢印キーで移動先選択
- スクリーンリーダー対応: aria-label、role="button"、aria-grabbed

### 9.3 エラーハンドリング
- ネットワークエラー: リトライ機能
- 権限エラー: ユーザーにトースト通知
- 競合エラー: ファイルが既に存在する場合の処理

## 10. 参考資料

- [@dnd-kit 公式ドキュメント](https://docs.dndkit.com/)
- [Sortable File Tree Example](https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/presets-sortable-tree--basic-setup)
- [GitHub API - Moving files](https://docs.github.com/en/rest/repos/contents)
