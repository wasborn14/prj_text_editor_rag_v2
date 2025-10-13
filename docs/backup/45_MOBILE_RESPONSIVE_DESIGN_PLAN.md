# モバイルレスポンシブデザイン対応プラン

## 現状分析

### 現在の問題点

1. **固定レイアウト**
   - サイドバー、エディタ、RAGパネルが常に横並び
   - モバイル画面では3カラムが収まらない
   - 固定幅（Sidebar: 300px, RAGPanel: 400px）がモバイルに不適切

2. **PC前提のUI要素**
   - ヘッダーにすべての情報を表示（リポジトリ名、ユーザー情報など）
   - モバイルでは横幅が足りず、テキストが切れる
   - ボタンが小さすぎてタップしにくい

3. **タッチ操作への非対応**
   - マウスホバーに依存したUI（右クリックメニュー）
   - リサイズハンドルがドラッグ前提
   - タップターゲットサイズが44px未満

4. **スクロール問題**
   - 固定高さ（h-screen）でネストしたスクロール
   - モバイルのアドレスバー表示/非表示でレイアウト崩れ

---

## 対応方針

### デザインパターン: **モーダル/ドロワー方式**

モバイルでは以下のようにUIを変更:
- **サイドバー**: 左からスライドインするドロワー
- **RAGパネル**: 下からスライドアップするボトムシート
- **エディタ**: フルスクリーン表示

```
┌─────────────────────────┐
│  Header (Fixed)         │  ← コンパクト化
├─────────────────────────┤
│                         │
│                         │
│  Editor                 │  ← フルスクリーン
│  (Full Screen)          │
│                         │
│                         │
├─────────────────────────┤
│ [≡] [RAG] [Save]        │  ← フローティングボタン
└─────────────────────────┘

// ドロワー表示時
┌─────────────────────────┐
│ ×  Files                │
├─────────────────────────┤
│ • file1.md              │
│ • file2.md              │
│ 📁 docs/                │
│   • doc1.md             │
└─────────────────────────┘
```

---

## 実装プラン

### フェーズ1: ブレークポイント設定 (必須)

#### 1.1 Tailwind ブレークポイント戦略

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // タブレット縦
      'md': '768px',   // タブレット横
      'lg': '1024px',  // PC小
      'xl': '1280px',  // PC中
      '2xl': '1536px', // PC大
    }
  }
}
```

**使用方針**:
- `< md (768px)`: モバイル表示（ドロワー/ボトムシート）
- `>= md`: PC表示（現在のレイアウト）

#### 1.2 レスポンシブユーティリティ作成

`frontend/src/hooks/useMediaQuery.ts`:
```typescript
export const useMediaQuery = (query: string) => {
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

// 使用例
const isMobile = useMediaQuery('(max-width: 768px)')
```

---

### フェーズ2: ヘッダーのモバイル対応 (優先度: 高)

#### 2.1 Header コンポーネント修正

**変更内容**:
```typescript
// frontend/src/components/organisms/Header/Header.tsx

return (
  <header className="bg-white shadow-sm border-b">
    <div className="flex items-center h-14 md:h-16 px-3 md:px-6">
      {/* モバイル: ハンバーガー + タイトルのみ */}
      {/* PC: すべての情報を表示 */}

      {/* Left: Sidebar Toggle */}
      <SidebarToggle
        isVisible={isVisible}
        onToggle={toggleVisibility}
        className="w-10 h-10 md:w-auto md:h-auto" // モバイルで大きく
      />

      {/* Center: Title + Repo (PC only) */}
      <div className="flex-1 ml-3 md:ml-4 overflow-hidden">
        <h1 className="text-base md:text-xl font-semibold text-gray-900 truncate">
          RAG Text Editor
        </h1>
        {selectedRepository && (
          <div className="hidden md:flex items-center space-x-2 mt-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-gray-600 truncate">
              {selectedRepository.full_name}
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* RAG Toggle - モバイルはアイコンのみ */}
        <button
          onClick={togglePanel}
          className="w-10 h-10 md:w-auto md:h-auto flex items-center justify-center md:px-3 md:py-1.5 rounded-lg"
        >
          <Search className="w-5 h-5 md:w-4 md:h-4" />
          <span className="hidden md:inline ml-2 text-sm">RAG Search</span>
        </button>

        {/* Avatar - モバイルは小さく */}
        <Avatar
          src={profile.avatar_url}
          size={isMobile ? 'xs' : 'sm'}
          className="md:mr-2"
        />

        {/* User Info - PC only */}
        <div className="hidden md:block">
          <div className="text-sm font-medium">{profile.display_name}</div>
          <div className="text-xs text-gray-500">@{profile.github_username}</div>
        </div>
      </div>
    </div>

    {/* モバイル: リポジトリ情報を2行目に表示 */}
    {selectedRepository && (
      <div className="md:hidden px-3 py-2 bg-gray-50 border-t text-xs text-gray-600 flex items-center">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
        <span className="truncate">{selectedRepository.full_name}</span>
      </div>
    )}
  </header>
)
```

---

### フェーズ3: サイドバーのドロワー化 (優先度: 高)

#### 3.1 モバイルドロワー実装

**変更内容**:
```typescript
// frontend/src/components/organisms/Sidebar/Sidebar.tsx

// モバイル判定
const isMobile = useMediaQuery('(max-width: 768px)')

if (!isVisible) return null

return (
  <>
    {/* モバイル: オーバーレイ */}
    {isMobile && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={closeContextMenu}
      />
    )}

    {/* サイドバー本体 */}
    <div
      className={`
        ${isMobile
          ? 'fixed left-0 top-0 bottom-0 z-50 w-80 transform transition-transform duration-300'
          : 'relative'
        }
        bg-white border-r border-gray-200
      `}
      style={isMobile ? undefined : sidebarStyle}
    >
      {/* Header with Close Button (mobile only) */}
      {isMobile && (
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Files</h2>
          <button
            onClick={() => setVisibility(false)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Content */}
      <SidebarHeader
        onSearch={handleSearch}
        selectedFilePath={selectedFilePath}
        selectedFileType={findNodeType(files, selectedFilePath)}
      />
      <SidebarContent
        files={files}
        selectedFilePath={selectedFilePath}
        onFileSelect={(file) => {
          onFileSelect(file)
          // モバイルではファイル選択後にドロワーを閉じる
          if (isMobile && file.type === 'file') {
            setVisibility(false)
          }
        }}
        searchQuery={searchQuery}
        onCreateConfirm={handleCreateConfirm}
        onRenameConfirm={handleRenameConfirm}
      />
    </div>

    {/* PC: Resize Handle */}
    {!isMobile && <ResizeHandle />}
  </>
)
```

#### 3.2 サイドバーストアの修正

```typescript
// frontend/src/stores/sidebarStore.ts

// レスポンシブ対応の初期化
useEffect(() => {
  const handleResize = () => {
    const isMobile = window.innerWidth < 768
    if (isMobile && isVisible) {
      // モバイルでは初期状態で非表示
      setVisibility(false)
    }
  }

  window.addEventListener('resize', handleResize)
  handleResize()

  return () => window.removeEventListener('resize', handleResize)
}, [])
```

---

### フェーズ4: RAGパネルのボトムシート化 (優先度: 中)

#### 4.1 モバイルボトムシート実装

**変更内容**:
```typescript
// frontend/src/components/organisms/RAGPanel/RAGPanel.tsx

const isMobile = useMediaQuery('(max-width: 768px)')

if (!isVisible) return null

return (
  <>
    {/* モバイル: オーバーレイ */}
    {isMobile && (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={() => setVisible(false)}
      />
    )}

    {/* パネル本体 */}
    <div
      className={`
        ${isMobile
          ? 'fixed left-0 right-0 bottom-0 z-50 h-[70vh] rounded-t-2xl'
          : 'fixed right-0 top-16 bottom-0 z-30'
        }
        bg-white border-gray-200 shadow-xl transition-all duration-300 flex
      `}
      style={isMobile ? undefined : { width: `${width}px` }}
    >
      {/* PC: Resize Handle */}
      {!isMobile && (
        <div
          className="w-1 hover:w-2 cursor-col-resize bg-gray-200 hover:bg-blue-400"
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50">
          {/* モバイル: ドラッグハンドル */}
          {isMobile && (
            <div className="flex justify-center py-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 px-3 py-1.5 rounded-lg
                    ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className={isMobile ? 'text-xs' : 'text-sm'}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button onClick={() => setVisible(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'search' && <RAGSearch repository={repository} />}
          {activeTab === 'chat' && <RAGChat repository={repository} />}
          {activeTab === 'sync' && <RAGSync repository={repository} />}
        </div>
      </div>
    </div>
  </>
)
```

---

### フェーズ5: エディタのモバイル最適化 (優先度: 高)

#### 5.1 エディタレイアウト調整

**変更内容**:
```typescript
// frontend/src/components/organisms/Editor/Editor.tsx

const isMobile = useMediaQuery('(max-width: 768px)')

return (
  <div className="h-full flex flex-col">
    {/* Tab Bar */}
    {openTabs.length > 0 && (
      <div className="border-b border-gray-200 bg-white">
        <div className="flex overflow-x-auto scrollbar-hide">
          {openTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 px-3 md:px-4 py-2 md:py-3
                border-b-2 whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600'
                }
              `}
            >
              {/* isDirty indicator */}
              {tab.isDirty && (
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
              )}

              {/* Tab name */}
              <span className="text-xs md:text-sm font-medium truncate max-w-[100px] md:max-w-[200px]">
                {tab.name}
              </span>

              {/* Close button - PC only */}
              {!isMobile && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTab(tab.id)
                  }}
                  className="ml-2 hover:bg-gray-200 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}
        </div>
      </div>
    )}

    {/* Editor Content */}
    <div className="flex-1 overflow-y-auto">
      {activeTab ? (
        <EditorContent activeTab={activeTab} isMobile={isMobile} />
      ) : (
        <EmptyState isMobile={isMobile} />
      )}
    </div>

    {/* モバイル: フローティングアクションボタン */}
    {isMobile && activeTab && (
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
        {/* Save Button */}
        {activeTab.isDirty && (
          <button
            onClick={handleSave}
            className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
          >
            <Save className="w-6 h-6" />
          </button>
        )}

        {/* Close Tab Button */}
        <button
          onClick={() => closeTab(activeTab.id)}
          className="w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    )}
  </div>
)
```

#### 5.2 Novel エディタのモバイル調整

```typescript
// frontend/src/components/organisms/Editor/EditorContent.tsx

<NovelWithMenu
  key={activeTab.id}
  content={parseToProseMirror(activeTab.content)}
  onChange={handleNovelChange}
  className={isMobile ? 'px-4 py-4' : 'px-8 py-6'} // モバイルでパディング削減
  editorProps={{
    attributes: {
      class: isMobile
        ? 'prose prose-sm max-w-none focus:outline-none min-h-[60vh]'
        : 'prose prose-lg max-w-none focus:outline-none min-h-screen'
    }
  }}
/>
```

---

### フェーズ6: タッチ操作の最適化 (優先度: 中)

#### 6.1 コンテキストメニューの改善

**現状**: 右クリックのみ（モバイルで使えない）

**変更内容**:
```typescript
// frontend/src/components/organisms/Sidebar/FileTreeItem.tsx

const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)

const handleTouchStart = (e: React.TouchEvent) => {
  const timer = setTimeout(() => {
    // 長押し検知 (500ms)
    handleContextMenu({
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any)
  }, 500)
  setLongPressTimer(timer)
}

const handleTouchEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    setLongPressTimer(null)
  }
}

return (
  <div
    onContextMenu={handleContextMenu}
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    className="..."
  >
    {/* ... */}
  </div>
)
```

#### 6.2 タップターゲットサイズの拡大

**変更方針**:
- すべてのボタン: 最低 44px × 44px
- ファイルツリー項目: 高さ 44px
- タブ: 高さ 48px

```typescript
// モバイル用のタップターゲット調整
<button
  className={`
    ${isMobile ? 'min-w-[44px] min-h-[44px]' : 'px-3 py-1.5'}
    rounded-lg
  `}
>
  {/* ... */}
</button>
```

---

### フェーズ7: ワークスペースレイアウトの統合 (優先度: 高)

#### 7.1 workspace/page.tsx の修正

```typescript
// frontend/src/app/workspace/page.tsx

const isMobile = useMediaQuery('(max-width: 768px)')

return (
  <div className="h-screen bg-gray-50 flex flex-col">
    {/* Header */}
    <Header profile={profile} selectedRepository={selectedRepository} />

    {/* Main Content */}
    <div className="flex-1 flex overflow-hidden relative">
      {/* Sidebar - モバイルではオーバーレイ、PCでは通常表示 */}
      {filesLoading ? (
        // Loading state
        !isMobile && isVisible && (
          <div className="w-80 bg-white border-r flex items-center justify-center">
            <div className="text-sm text-gray-500">Loading files...</div>
          </div>
        )
      ) : repositoryFiles ? (
        <Sidebar
          files={repositoryFiles.contents}
          selectedFilePath={selectedFile?.path}
          onFileSelect={handleFileSelect}
          repository={selectedRepository}
          onRefresh={() => refetchFiles()}
        />
      ) : null}

      {/* Editor - フルスクリーン */}
      <div className="flex-1 bg-white flex flex-col">
        <Editor />
      </div>

      {/* RAG Panel - モバイルではボトムシート、PCでは右パネル */}
      <RAGPanel
        repository={selectedRepository ? `${selectedRepository.owner}/${selectedRepository.name}` : undefined}
      />
    </div>
  </div>
)
```

---

## 追加機能

### 1. スワイプジェスチャー

**サイドバー開閉**:
```typescript
// useSwipeGesture.ts
export const useSwipeGesture = (onSwipeRight: () => void, onSwipeLeft: () => void) => {
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      onSwipeLeft()
    }
    if (touchStart - touchEnd < -50) {
      onSwipeRight()
    }
  }

  return { handleTouchStart, handleTouchEnd }
}
```

### 2. プルトゥリフレッシュ

```typescript
// RAGSync での実装
const [isPulling, setIsPulling] = useState(false)
const [pullDistance, setPullDistance] = useState(0)

const handleTouchMove = (e: TouchEvent) => {
  const scrollTop = window.scrollY
  if (scrollTop === 0 && e.touches[0].clientY > touchStart) {
    const distance = e.touches[0].clientY - touchStart
    setPullDistance(Math.min(distance, 100))

    if (distance > 80) {
      setIsPulling(true)
    }
  }
}
```

### 3. モバイル専用ナビゲーション

**ボトムタブナビゲーション** (オプション):
```typescript
// 画面下部に固定タブ
<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-30">
  <div className="flex justify-around py-2">
    <button onClick={() => setVisibility(true)}>
      <Menu className="w-6 h-6" />
      <span className="text-xs">Files</span>
    </button>
    <button onClick={() => setVisible(true)}>
      <Search className="w-6 h-6" />
      <span className="text-xs">Search</span>
    </button>
  </div>
</nav>
```

---

## パフォーマンス最適化

### モバイル専用の最適化

1. **画像の遅延読み込み**
   ```typescript
   <img loading="lazy" src={avatar_url} />
   ```

2. **仮想スクロール**
   - ファイルツリーが大きい場合、`react-window` を使用

3. **コードスプリッティング**
   ```typescript
   const NovelEditor = dynamic(() => import('./NovelEditor'), {
     loading: () => <div>Loading editor...</div>,
     ssr: false
   })
   ```

---

## テスト戦略

### デバイステスト

1. **実機テスト**
   - iPhone SE (375px)
   - iPhone 12/13/14 (390px)
   - iPhone 14 Pro Max (430px)
   - iPad (768px)
   - Android (各種サイズ)

2. **ブラウザDevToolsテスト**
   - Chrome DevTools: Device Mode
   - Safari Web Inspector: Responsive Design Mode

3. **自動テスト**
   ```typescript
   // Playwright でモバイルテスト
   test('mobile sidebar opens on hamburger click', async ({ page }) => {
     await page.setViewportSize({ width: 375, height: 667 })
     await page.goto('/workspace')
     await page.click('[aria-label="Toggle sidebar"]')
     await expect(page.locator('aside')).toBeVisible()
   })
   ```

---

## ロールアウト計画

### ステップ1: 基礎対応 (Week 1-2)
- [ ] ブレークポイント設定
- [ ] Header のモバイル対応
- [ ] Sidebar のドロワー化
- [ ] タップターゲットサイズ調整

### ステップ2: コア機能 (Week 3-4)
- [ ] RAGPanel のボトムシート化
- [ ] Editor のモバイル最適化
- [ ] フローティングアクションボタン
- [ ] コンテキストメニューの長押し対応

### ステップ3: UX改善 (Week 5-6)
- [ ] スワイプジェスチャー
- [ ] アニメーション調整
- [ ] モバイル専用ナビゲーション
- [ ] 実機テスト + 修正

### ステップ4: 最適化 (Week 7-8)
- [ ] パフォーマンス最適化
- [ ] PWA対応（オプション）
- [ ] オフライン対応（オプション）
- [ ] 最終テスト + リリース

---

## 懸念事項とリスク

### 技術的課題

1. **Novel エディタのモバイル対応**
   - TipTap のモバイル互換性
   - ツールバーの表示方法
   - 仮想キーボード対応

2. **パフォーマンス**
   - 大きなMarkdownファイルの編集
   - ファイルツリーのレンダリング
   - アニメーション

3. **iOS Safari の制約**
   - 100vh 問題（アドレスバー分の高さ）
   - タッチイベントの制限
   - スクロール挙動

### 解決策

```typescript
// 100vh 問題の解決
const useViewportHeight = () => {
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    }

    setVH()
    window.addEventListener('resize', setVH)
    return () => window.removeEventListener('resize', setVH)
  }, [])
}

// CSS
.h-screen-mobile {
  height: 100vh;
  height: calc(var(--vh, 1vh) * 100);
}
```

---

## 成功指標

### メトリクス

1. **レスポンシブ対応率**
   - モバイル画面で全機能が使用可能: 100%
   - タップターゲットサイズ準拠: 95%以上

2. **パフォーマンス**
   - Lighthouse モバイルスコア: 90+
   - FCP (First Contentful Paint): < 1.5s
   - LCP (Largest Contentful Paint): < 2.5s

3. **ユーザビリティ**
   - タスク完了率（モバイル）: 90%以上
   - エラー率: < 5%

---

## 参考リンク

- [Material Design: Responsive Layout Grid](https://material.io/design/layout/responsive-layout-grid.html)
- [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [WCAG 2.1: Touch Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Next.js: Responsive Design](https://nextjs.org/docs/app/building-your-application/styling/tailwind-css)

---

**最終更新**: 2025年10月5日
