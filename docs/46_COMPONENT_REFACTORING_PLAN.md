# コンポーネントリファクタリングプラン

## 目的

モバイル対応を実装する前に、コンポーネントを整理・リファクタリングすることで:
1. **保守性向上**: コードの見通しを良くする
2. **再利用性向上**: 共通ロジックを抽出
3. **モバイル対応の容易化**: レスポンシブ対応を実装しやすくする
4. **パフォーマンス向上**: 不要な再レンダリングを削減

---

## 現状分析

### ファイルサイズ分析

| ファイル | 行数 | 問題点 |
|---------|------|--------|
| `NovelWithMenu.tsx` | 457 | 大きすぎる、複数の責務が混在 |
| `Sidebar.tsx` | 346 | ビジネスロジックが多すぎる |
| `RepositorySelector.tsx` | 323 | 状態管理とUIが密結合 |
| `FileTreeItem.tsx` | 275 | 再帰的レンダリングとロジックが複雑 |
| `SidebarContent.tsx` | 268 | フィルタリングロジックが肥大化 |
| `Icon.tsx` | 225 | アイコンマッピングが長い |
| `RAGSync.tsx` | 161 | ポーリングロジックとUIが混在 |

### Atomic Design の問題点

**現在の構造**:
```
components/
├── atoms/          # 基本コンポーネント (7 files)
├── molecules/      # 複合コンポーネント (6 files)
└── organisms/      # 大規模コンポーネント (15 files)
```

**問題**:
1. **organisms が大きすぎる**: 346行の Sidebar など
2. **責務の分離が不十分**: UIとロジックが混在
3. **共通ロジックの重複**: 各コンポーネントで似たようなロジック
4. **型定義の分散**: 各ファイルに interface が散在

---

## リファクタリング方針

### 1. レイヤー分離: **Container/Presenter パターン**

現在の organisms を2つに分割:

```typescript
// Container (Logic)
export function SidebarContainer(props) {
  // ビジネスロジック
  // API呼び出し
  // 状態管理

  return <SidebarPresenter {...presenterProps} />
}

// Presenter (UI)
export function SidebarPresenter(props) {
  // Pure UI
  // Props から受け取ったデータを表示
  // イベントハンドラを呼ぶだけ

  return <div>...</div>
}
```

**メリット**:
- ✅ ロジックとUIが分離される
- ✅ テストしやすくなる
- ✅ モバイル/PC で Presenter を切り替えやすい

### 2. カスタムフックの抽出

**現状**: Sidebar.tsx に全ロジックが詰まっている

**改善**:
```typescript
// hooks/sidebar/useFileOperations.ts
export function useFileOperations(repository, onRefresh) {
  const { createFile } = useCreateFile()
  const { deleteFile } = useDeleteFile()
  const { renameFile } = useRenameFile()

  const handleCreate = async (name, type) => { ... }
  const handleDelete = async (path, type) => { ... }
  const handleRename = async (oldPath, newPath) => { ... }

  return { handleCreate, handleDelete, handleRename }
}

// hooks/sidebar/useContextMenu.ts
export function useContextMenu() {
  const { contextMenu, setContextMenu, closeContextMenu } = useSidebarStore()

  const menuItems = useMemo(() => [...], [contextMenu])

  return { contextMenu, menuItems, closeContextMenu }
}
```

### 3. 共通コンポーネントの抽出

**新規作成するコンポーネント**:

```typescript
// components/molecules/Overlay/Overlay.tsx
export function Overlay({ isVisible, onClick, zIndex = 40 }) {
  if (!isVisible) return null
  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-${zIndex}`}
      onClick={onClick}
    />
  )
}

// components/molecules/Panel/Panel.tsx
export function Panel({
  isVisible,
  position = 'right',  // 'left' | 'right' | 'bottom'
  width,
  children
}) {
  return (
    <div
      className={`fixed ${getPositionClasses(position)} bg-white shadow-xl`}
      style={{ width }}
    >
      {children}
    </div>
  )
}

// components/molecules/ResizablePanel/ResizablePanel.tsx
export function ResizablePanel({
  children,
  defaultWidth,
  minWidth,
  maxWidth
}) {
  const [width, setWidth] = useState(defaultWidth)
  const { handleMouseDown, isResizing } = useResize(setWidth)

  return (
    <div style={{ width }}>
      <div className="resize-handle" onMouseDown={handleMouseDown} />
      {children}
    </div>
  )
}
```

---

## 具体的なリファクタリングプラン

### Phase 1: Sidebar のリファクタリング (優先度: 高)

#### 現状の問題
- **346行**: 長すぎる
- **多重責務**: ファイル操作、コンテキストメニュー、検索、状態管理
- **密結合**: useCreateFile, useDeleteFile, useRenameFile が直接呼ばれている

#### リファクタリング後の構造

```
organisms/Sidebar/
├── Sidebar.tsx                    # Container (100行以内)
├── SidebarPresenter.tsx           # UI (80行以内)
├── hooks/
│   ├── useFileOperations.ts       # CRUD操作
│   ├── useContextMenu.ts          # コンテキストメニュー
│   └── useSidebarLayout.ts        # レスポンシブ対応
└── components/
    ├── SidebarOverlay.tsx         # オーバーレイ
    └── SidebarActions.tsx         # アクションボタン群
```

#### 実装例

```typescript
// Sidebar.tsx (Container)
export function Sidebar({
  files,
  selectedFilePath,
  onFileSelect,
  repository,
  onRefresh,
}: SidebarProps) {
  const { isVisible, width } = useSidebarStore()
  const { isMobile } = useSidebarLayout()
  const fileOps = useFileOperations(repository, onRefresh)
  const contextMenu = useContextMenu(fileOps)
  const [searchQuery, setSearchQuery] = useState('')

  if (!isVisible) return null

  return (
    <SidebarPresenter
      isMobile={isMobile}
      width={width}
      files={files}
      selectedFilePath={selectedFilePath}
      searchQuery={searchQuery}
      contextMenu={contextMenu}
      onFileSelect={onFileSelect}
      onSearch={setSearchQuery}
    />
  )
}

// SidebarPresenter.tsx (UI)
export function SidebarPresenter({
  isMobile,
  width,
  files,
  selectedFilePath,
  searchQuery,
  contextMenu,
  onFileSelect,
  onSearch,
}: SidebarPresenterProps) {
  return (
    <>
      {/* Overlay */}
      {isMobile && <Overlay isVisible onClick={closeContextMenu} />}

      {/* Panel */}
      <Panel
        position={isMobile ? 'left-drawer' : 'left-fixed'}
        width={width}
      >
        <SidebarHeader onSearch={onSearch} />
        <SidebarContent
          files={files}
          selectedFilePath={selectedFilePath}
          searchQuery={searchQuery}
          onFileSelect={onFileSelect}
        />
      </Panel>

      {/* Context Menu */}
      {contextMenu.isVisible && (
        <ContextMenu {...contextMenu} />
      )}
    </>
  )
}
```

---

### Phase 2: Editor のリファクタリング (優先度: 高)

#### 現状の問題
- **NovelWithMenu.tsx が 457行**: エディタ設定、メニュー、ツールバーが混在
- **EditorContent.tsx**: Novel との結合度が高い
- **タブ管理**: EditorTabs.tsx が独立しているが、モバイル対応が不十分

#### リファクタリング後の構造

```
organisms/Editor/
├── Editor.tsx                     # Container
├── EditorPresenter.tsx            # UI Layout
├── hooks/
│   ├── useEditorLayout.ts         # レスポンシブ
│   ├── useEditorActions.ts        # 保存、閉じる等
│   └── useNovelEditor.ts          # Novel設定
├── components/
│   ├── EditorToolbar.tsx          # ツールバー (PC/Mobile)
│   ├── EditorTabs.tsx             # タブバー
│   ├── FloatingActionButton.tsx   # FAB (モバイル専用)
│   └── NovelEditor.tsx            # Novel wrapper (シンプル化)
└── config/
    └── novelConfig.ts             # エディタ設定
```

#### 実装例

```typescript
// Editor.tsx (Container)
export function Editor() {
  const { openTabs, activeTabId, closeTab } = useEditorStore()
  const { isMobile } = useEditorLayout()
  const editorActions = useEditorActions()

  const activeTab = openTabs.find(tab => tab.id === activeTabId)

  return (
    <EditorPresenter
      isMobile={isMobile}
      openTabs={openTabs}
      activeTab={activeTab}
      actions={editorActions}
      onCloseTab={closeTab}
    />
  )
}

// EditorPresenter.tsx (UI)
export function EditorPresenter({
  isMobile,
  openTabs,
  activeTab,
  actions,
  onCloseTab,
}: EditorPresenterProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <EditorTabs
        tabs={openTabs}
        activeTabId={activeTab?.id}
        isMobile={isMobile}
        onClose={onCloseTab}
      />

      {/* Content */}
      <div className="flex-1">
        {activeTab ? (
          <NovelEditor
            content={activeTab.content}
            onChange={actions.handleChange}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Floating Action Buttons (Mobile only) */}
      {isMobile && activeTab && (
        <FloatingActionButton
          isDirty={activeTab.isDirty}
          onSave={actions.handleSave}
          onClose={() => onCloseTab(activeTab.id)}
        />
      )}
    </div>
  )
}

// config/novelConfig.ts (設定抽出)
export const getNovelConfig = (isMobile: boolean) => ({
  editorProps: {
    attributes: {
      class: isMobile
        ? 'prose prose-sm max-w-none'
        : 'prose prose-lg max-w-none'
    }
  },
  // ... その他の設定
})
```

---

### Phase 3: RAG Panel のリファクタリング (優先度: 中)

#### 現状の問題
- **RAGPanel.tsx (134行)**: タブ管理、リサイズ、レイアウトが混在
- **RAGSync.tsx (161行)**: ポーリングロジックとUIが密結合
- **重複コード**: 各タブで似たようなレイアウト

#### リファクタリング後の構造

```
organisms/RAGPanel/
├── RAGPanel.tsx                   # Container
├── RAGPanelPresenter.tsx          # UI Layout
├── hooks/
│   ├── useRAGPanelLayout.ts       # レスポンシブ
│   └── useSyncPolling.ts          # ポーリング抽出
├── components/
│   ├── RAGPanelHeader.tsx         # ヘッダー + タブ
│   ├── RAGSearch.tsx              # 検索タブ
│   ├── RAGChat.tsx                # チャットタブ
│   └── RAGSync.tsx                # 同期タブ (シンプル化)
└── types/
    └── ragTypes.ts                # 型定義
```

#### 実装例

```typescript
// hooks/useSyncPolling.ts (ロジック抽出)
export function useSyncPolling(jobId: string | null) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  useEffect(() => {
    if (!jobId) return

    const poll = async () => {
      // ポーリングロジック
    }

    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [jobId])

  return { status, isPolling }
}

// RAGSync.tsx (シンプル化)
export function RAGSync({ repository }: RAGSyncProps) {
  const { syncRepository } = useRAGSync()
  const [jobId, setJobId] = useState<string | null>(null)
  const { status, isPolling } = useSyncPolling(jobId)

  const handleSync = async () => {
    const result = await syncRepository(repository)
    setJobId(result.job_id)
  }

  return (
    <div className="p-4">
      <Button onClick={handleSync} disabled={isPolling}>
        {isPolling ? 'Syncing...' : 'Sync Repository'}
      </Button>
      {status && <SyncStatus {...status} />}
    </div>
  )
}
```

---

### Phase 4: 共通Hooks の整理 (優先度: 高)

#### 新規作成する共通フック

```typescript
// hooks/common/useMediaQuery.ts
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  return matches
}

// hooks/common/useResponsive.ts
export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return { isMobile, isTablet, isDesktop }
}

// hooks/common/useResize.ts
export function useResize(
  initialWidth: number,
  minWidth: number,
  maxWidth: number
) {
  const [width, setWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)

  const handleMouseDown = useCallback(() => {
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX))
      setWidth(newWidth)
    }

    const handleMouseUp = () => setIsResizing(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth])

  return { width, setWidth, isResizing, handleMouseDown }
}

// hooks/common/useLongPress.ts (モバイル対応)
export function useLongPress(
  onLongPress: (e: React.TouchEvent) => void,
  delay = 500
) {
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const timer = setTimeout(() => {
      onLongPress(e)
    }, delay)
    setLongPressTimer(timer)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
  }

  return { handleTouchStart, handleTouchEnd }
}
```

---

### Phase 5: 型定義の整理 (優先度: 中)

#### 現状の問題
- 各コンポーネントに interface が散在
- 重複する型定義
- 型の一貫性がない

#### 改善策

```
types/
├── index.ts                    # Re-export
├── database.types.ts           # Supabase (既存)
├── common.types.ts             # 共通型
├── editor.types.ts             # エディタ関連
├── sidebar.types.ts            # サイドバー関連
├── rag.types.ts                # RAG関連
└── responsive.types.ts         # レスポンシブ関連
```

```typescript
// types/common.types.ts
export type ViewMode = 'tree' | 'list' | 'bookmarks'
export type FileType = 'file' | 'dir'
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

// types/sidebar.types.ts
export interface FileTreeNode {
  name: string
  path: string
  type: FileType
  size?: number
  children?: FileTreeNode[]
}

export interface ContextMenuState {
  x: number
  y: number
  targetPath: string
  targetType: FileType
}

export interface CreatingItemState {
  type: 'file' | 'folder'
  parentPath: string
}

// types/responsive.types.ts
export interface ResponsiveBreakpoints {
  mobile: number    // 0-768px
  tablet: number    // 768-1024px
  desktop: number   // 1024px+
}

export interface LayoutConfig {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  breakpoints: ResponsiveBreakpoints
}
```

---

## ディレクトリ構造の最終形

```
frontend/src/
├── components/
│   ├── atoms/                         # 基本コンポーネント
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Icon/
│   │   ├── Avatar/
│   │   └── LoadingSpinner/
│   │
│   ├── molecules/                     # 複合コンポーネント
│   │   ├── ConfirmDialog/
│   │   ├── ContextMenu/
│   │   ├── Overlay/                   # 新規
│   │   ├── Panel/                     # 新規
│   │   ├── ResizablePanel/            # 新規
│   │   ├── FloatingActionButton/      # 新規
│   │   └── CreateFileInput/
│   │
│   └── organisms/                     # 大規模コンポーネント
│       ├── Editor/
│       │   ├── Editor.tsx             # Container
│       │   ├── EditorPresenter.tsx    # UI
│       │   ├── hooks/
│       │   ├── components/
│       │   └── config/
│       │
│       ├── Sidebar/
│       │   ├── Sidebar.tsx            # Container
│       │   ├── SidebarPresenter.tsx   # UI
│       │   ├── hooks/
│       │   └── components/
│       │
│       ├── RAGPanel/
│       │   ├── RAGPanel.tsx           # Container
│       │   ├── RAGPanelPresenter.tsx  # UI
│       │   ├── hooks/
│       │   ├── components/
│       │   └── types/
│       │
│       └── Header/
│           ├── Header.tsx             # Container
│           ├── HeaderPresenter.tsx    # UI
│           └── hooks/
│
├── hooks/                             # カスタムフック
│   ├── common/                        # 共通フック
│   │   ├── useMediaQuery.ts
│   │   ├── useResponsive.ts
│   │   ├── useResize.ts
│   │   └── useLongPress.ts
│   │
│   ├── editor/                        # エディタ専用
│   │   ├── useEditorActions.ts
│   │   └── useNovelEditor.ts
│   │
│   ├── sidebar/                       # サイドバー専用
│   │   ├── useFileOperations.ts
│   │   ├── useContextMenu.ts
│   │   └── useSidebarLayout.ts
│   │
│   └── rag/                           # RAG専用
│       ├── useRAGSearch.ts
│       ├── useRAGChat.ts
│       ├── useRAGSync.ts
│       └── useSyncPolling.ts
│
├── types/                             # 型定義
│   ├── index.ts
│   ├── database.types.ts
│   ├── common.types.ts
│   ├── editor.types.ts
│   ├── sidebar.types.ts
│   ├── rag.types.ts
│   └── responsive.types.ts
│
└── utils/                             # ユーティリティ
    ├── time.ts
    ├── responsive.ts                  # 新規
    └── validation.ts                  # 新規
```

---

## 実装順序

### Week 1: 基礎整備
- [ ] 共通フックの作成 (`useMediaQuery`, `useResponsive`, `useResize`)
- [ ] 共通コンポーネントの作成 (`Overlay`, `Panel`, `ResizablePanel`)
- [ ] 型定義の整理

### Week 2: Sidebar リファクタリング
- [ ] `useFileOperations` フックの作成
- [ ] `useContextMenu` フックの作成
- [ ] `SidebarPresenter` の作成
- [ ] `Sidebar` Container の簡略化

### Week 3: Editor リファクタリング
- [ ] `useEditorActions` フックの作成
- [ ] `NovelEditor` の簡略化
- [ ] `EditorPresenter` の作成
- [ ] `FloatingActionButton` の作成

### Week 4: RAG Panel リファクタリング
- [ ] `useSyncPolling` フックの作成
- [ ] `RAGPanelPresenter` の作成
- [ ] 各タブコンポーネントの簡略化

---

## 期待される効果

### コード品質
- ✅ 各ファイルが **150行以内** に収まる
- ✅ テストカバレッジが向上
- ✅ バグの発生率が低下

### 開発効率
- ✅ モバイル対応の実装が **2倍速** に
- ✅ 新機能追加が容易になる
- ✅ チーム開発がスムーズに

### パフォーマンス
- ✅ 不要な再レンダリングが削減
- ✅ バンドルサイズが削減
- ✅ 初期ロードが高速化

---

## リスクと対策

### リスク1: リファクタリング中のバグ
**対策**:
- 段階的にリファクタリング
- 各フェーズでテスト実施
- 元のコードは残しておく（コメントアウト）

### リスク2: 工数の増加
**対策**:
- 優先度の高いものから実施
- モバイル対応に必要な部分を優先
- 完璧を求めず、80%で良しとする

### リスク3: 既存機能の破壊
**対策**:
- E2Eテストの整備
- 手動テストのチェックリスト作成
- Staging環境での検証

---

## チェックリスト

### リファクタリング完了の基準
- [ ] すべてのファイルが 200行以内
- [ ] Container/Presenter パターンが適用されている
- [ ] 共通ロジックがフックに抽出されている
- [ ] 型定義が集約されている
- [ ] 既存機能が正常に動作する
- [ ] パフォーマンスが改善している（Lighthouse スコア）
- [ ] ドキュメントが更新されている

---

## 参考資料

- [React: Thinking in Components](https://react.dev/learn/thinking-in-react)
- [Container/Presenter Pattern](https://www.patterns.dev/posts/presentational-container-pattern)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/)

---

**作成日**: 2025年10月5日
**想定期間**: 4週間
**優先度**: モバイル対応前に実施すべき
