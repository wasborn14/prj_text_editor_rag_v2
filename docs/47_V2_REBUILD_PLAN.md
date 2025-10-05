# V2 完全リビルドプラン

## 戦略: Reference V2 アプローチ

### コンセプト

現在の`frontend/`を`reference_v2/`として保存し、**ゼロから新しいフロントエンドを構築**する。

**メリット**:
- ✅ 既存コードに縛られず、最適な設計ができる
- ✅ 最初からモバイル対応を考慮した設計
- ✅ 技術的負債をゼロに
- ✅ いつでも参照可能（reference_v2 として残す）
- ✅ 段階的に移行できる

**デメリット**:
- ⚠️ 初期開発に時間がかかる（ただし長期的には効率的）
- ⚠️ 一時的に2つのコードベースを管理

---

## プロジェクト構造

```
prj_text_editor_rag_v1/
├── backend/                    # 既存（変更なし）
├── reference_v2/               # 現在の frontend をリネーム
│   ├── src/
│   ├── package.json
│   └── README.md
├── frontend/                   # 新規作成（V2）
│   ├── src/
│   ├── package.json
│   └── README.md
└── docs/
    ├── 45_MOBILE_RESPONSIVE_DESIGN_PLAN.md
    ├── 46_COMPONENT_REFACTORING_PLAN.md
    └── 47_V2_REBUILD_PLAN.md (このファイル)
```

---

## V2 の設計方針

### 1. モバイルファースト設計

**従来（V1）**: PC → モバイル対応を追加
**V2**: モバイル → PC拡張

```typescript
// デフォルトはモバイル、md: でPC拡張
<div className="flex-col md:flex-row">
  <Sidebar />  {/* モバイル: ドロワー、PC: 固定 */}
  <Editor />   {/* モバイル: フルスクリーン、PC: 分割 */}
</div>
```

### 2. Container/Presenter パターンを最初から適用

```
components/
├── features/                   # 機能単位でグループ化
│   ├── editor/
│   │   ├── EditorContainer.tsx
│   │   ├── EditorPresenter.tsx
│   │   ├── hooks/
│   │   └── components/
│   │
│   ├── sidebar/
│   │   ├── SidebarContainer.tsx
│   │   ├── SidebarPresenter.tsx
│   │   ├── hooks/
│   │   └── components/
│   │
│   └── rag/
│       ├── RAGPanelContainer.tsx
│       ├── RAGPanelPresenter.tsx
│       ├── hooks/
│       └── components/
│
└── ui/                         # 共通UIコンポーネント
    ├── Button/
    ├── Input/
    ├── Overlay/
    ├── Panel/
    └── FloatingActionButton/
```

### 3. TypeScript 厳格化

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 4. 最新技術スタックの採用

| 項目 | V1 (現在) | V2 (新規) | 理由 |
|------|----------|----------|------|
| Next.js | 15.5 | 15.5 | 最新維持 |
| React | 19 | 19 | 最新維持 |
| Zustand | 5.0 | 5.0 | 最新維持 |
| Tailwind | 4 | 4 | 最新維持 |
| Novel | 1.0 | **Novel 2.0** (検討) | より良いモバイル対応 |
| 状態管理 | Zustand | **Zustand + Jotai** (検討) | より細かい粒度 |
| フォーム | 手動 | **React Hook Form** | バリデーション強化 |
| UI Kit | 手作り | **shadcn/ui** | 高品質コンポーネント |
| アニメーション | Tailwind | **Framer Motion** | スムーズなアニメ |

---

## フェーズ別実装計画

### Phase 0: セットアップ (Week 1)

#### ステップ1: 既存コードの保存

```bash
# 現在の frontend を reference_v2 にリネーム
cd /Users/estyle-0170/Environment/test/2025/09/prj_text_editor_rag_v1
mv frontend reference_v2

# reference_v2 の README 更新
cat > reference_v2/README.md << 'EOF'
# Reference V2 (旧フロントエンド)

このディレクトリは、V2リビルド前の参照用コードです。

**作成日**: 2025年10月5日
**ステータス**: Reference Only (開発停止)

## 参照目的

- V2実装時の参考資料
- 既存機能の動作確認
- API仕様の確認

## 実装済み機能

- GitHub OAuth認証
- リポジトリ選択
- ファイルツリー表示
- Markdown エディタ (Novel)
- ファイルCRUD (作成、削除、名前変更)
- RAG検索パネル
- 非同期同期ジョブ

## 技術スタック

- Next.js 15.5
- React 19
- Zustand 5.0
- Tailwind CSS 4
- Novel 1.0
EOF
```

#### ステップ2: 新しいプロジェクト作成

```bash
# 新しい Next.js プロジェクト作成
npx create-next-app@latest frontend --typescript --tailwind --app --no-src-dir

cd frontend

# 必要なパッケージインストール
npm install zustand @supabase/ssr @supabase/supabase-js
npm install @tanstack/react-query lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install framer-motion
npm install react-hook-form zod

# 開発用パッケージ
npm install -D @types/node @types/react @types/react-dom
npm install -D prettier eslint-config-prettier
npm install -D tailwindcss-animate
```

#### ステップ3: プロジェクト構造のセットアップ

```bash
# ディレクトリ作成
mkdir -p src/{app,components,hooks,lib,stores,types,utils}
mkdir -p src/components/{ui,features}
mkdir -p src/components/features/{auth,editor,sidebar,rag}
mkdir -p src/hooks/{common,editor,sidebar,rag}

# 設定ファイルコピー（必要なものだけ）
cp ../reference_v2/.env.local .env.local
cp ../reference_v2/next.config.ts next.config.ts
```

---

### Phase 1: 基盤構築 (Week 2)

#### 実装内容

1. **認証システム**
   - Supabase クライアント設定
   - GitHub OAuth フロー
   - 認証状態管理 (Zustand)

2. **共通UIコンポーネント (shadcn/ui)**
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add input
   npx shadcn-ui@latest add dialog
   npx shadcn-ui@latest add dropdown-menu
   npx shadcn-ui@latest add sheet  # モバイルドロワー用
   ```

3. **レスポンシブフック**
   ```typescript
   // hooks/common/useResponsive.ts
   // hooks/common/useMediaQuery.ts
   // hooks/common/useBreakpoint.ts
   ```

4. **型定義**
   ```typescript
   // types/database.types.ts (reference_v2 からコピー)
   // types/common.types.ts
   // types/responsive.types.ts
   ```

#### マイルストーン
- [ ] ログイン画面が動作
- [ ] Supabase 認証が動作
- [ ] レスポンシブフックが動作
- [ ] 基本UIコンポーネントが揃っている

---

### Phase 2: リポジトリ選択 (Week 3)

#### 実装内容

```
src/
├── app/
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Login
│   └── repository-setup/
│       └── page.tsx                  # Repository selection
│
└── components/
    └── features/
        └── repository/
            ├── RepositoryList.tsx
            ├── RepositoryCard.tsx
            └── hooks/
                └── useRepositories.ts
```

#### 設計のポイント

**モバイルファースト**:
```typescript
// RepositoryCard.tsx
<div className="
  flex flex-col md:flex-row        // モバイル: 縦、PC: 横
  p-4 md:p-6                        // モバイル: 小、PC: 大
  space-y-3 md:space-y-0 md:space-x-4
">
  <div className="flex-1">
    <h3 className="text-base md:text-lg">{repo.name}</h3>
    <p className="text-sm md:text-base">{repo.description}</p>
  </div>
</div>
```

#### マイルストーン
- [ ] GitHub API でリポジトリ取得
- [ ] リポジトリカードがモバイル/PC で最適表示
- [ ] リポジトリ選択が動作
- [ ] Supabase に保存

---

### Phase 3: ワークスペースレイアウト (Week 4-5)

#### 実装内容

```
src/
├── app/
│   └── workspace/
│       ├── layout.tsx                # Workspace layout
│       └── page.tsx                  # Main workspace
│
└── components/
    ├── features/
    │   ├── editor/
    │   │   ├── EditorContainer.tsx   # ロジック
    │   │   ├── EditorPresenter.tsx   # UI
    │   │   ├── hooks/
    │   │   │   ├── useEditor.ts
    │   │   │   └── useEditorLayout.ts
    │   │   └── components/
    │   │       ├── EditorTabs.tsx
    │   │       ├── EditorContent.tsx
    │   │       └── FloatingActions.tsx
    │   │
    │   └── sidebar/
    │       ├── SidebarContainer.tsx
    │       ├── SidebarPresenter.tsx
    │       ├── hooks/
    │       │   ├── useSidebar.ts
    │       │   ├── useFileTree.ts
    │       │   └── useFileOperations.ts
    │       └── components/
    │           ├── FileTree.tsx
    │           ├── FileTreeItem.tsx
    │           ├── SearchBar.tsx
    │           └── FileActions.tsx
    │
    └── ui/
        ├── Overlay.tsx               # オーバーレイ
        ├── Drawer.tsx                # モバイルドロワー
        ├── Sheet.tsx                 # ボトムシート
        └── FAB.tsx                   # フローティングボタン
```

#### レイアウト設計

**workspace/layout.tsx**:
```typescript
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isMobile } = useResponsive()

  return (
    <div className="h-screen flex flex-col">
      {/* Header - レスポンシブ対応 */}
      <Header />

      {/* Main - モバイル: スタック、PC: 横並び */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {children}
      </div>
    </div>
  )
}
```

**workspace/page.tsx**:
```typescript
export default function WorkspacePage() {
  const { isMobile } = useResponsive()

  return (
    <>
      {/* Sidebar - モバイル: Drawer、PC: Fixed */}
      {isMobile ? (
        <SidebarDrawer />
      ) : (
        <SidebarFixed />
      )}

      {/* Editor - 両方で共通 */}
      <EditorContainer />

      {/* RAG Panel - モバイル: BottomSheet、PC: RightPanel */}
      {isMobile ? (
        <RAGBottomSheet />
      ) : (
        <RAGRightPanel />
      )}
    </>
  )
}
```

#### マイルストーン
- [ ] ワークスペースレイアウトが動作
- [ ] サイドバー（ドロワー/固定）が動作
- [ ] エディタエリアが動作
- [ ] モバイル/PC で正しく切り替わる

---

### Phase 4: ファイル操作 (Week 6-7)

#### 実装内容

1. **ファイルツリー表示**
   - GitHub API 統合
   - ツリー構造のレンダリング
   - 展開/折りたたみ

2. **ファイルCRUD**
   - 作成（モーダル/インライン）
   - 削除（確認ダイアログ）
   - 名前変更（インライン編集）

3. **コンテキストメニュー**
   - PC: 右クリック
   - モバイル: 長押し

#### 設計のポイント

**useLongPress フック（モバイル対応）**:
```typescript
// hooks/common/useLongPress.ts
export function useLongPress(
  callback: (e: React.TouchEvent) => void,
  duration = 500
) {
  const timerRef = useRef<NodeJS.Timeout>()

  const start = useCallback((e: React.TouchEvent) => {
    timerRef.current = setTimeout(() => {
      callback(e)
    }, duration)
  }, [callback, duration])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }, [])

  return { onTouchStart: start, onTouchEnd: cancel }
}
```

**FileTreeItem（レスポンシブ）**:
```typescript
export function FileTreeItem({ node }: FileTreeItemProps) {
  const { isMobile } = useResponsive()
  const longPress = useLongPress(handleContextMenu)

  return (
    <div
      className={`
        flex items-center
        px-2 py-2 md:py-1.5              // モバイル: 大きいタップ領域
        min-h-[44px] md:min-h-[32px]     // 最小44px (WCAG)
        rounded cursor-pointer
        hover:bg-gray-100 active:bg-gray-200
      `}
      onClick={handleClick}
      onContextMenu={!isMobile ? handleContextMenu : undefined}
      {...(isMobile ? longPress : {})}
    >
      {/* アイコン、名前など */}
    </div>
  )
}
```

#### マイルストーン
- [ ] ファイルツリー表示が動作
- [ ] ファイル作成が動作
- [ ] ファイル削除が動作
- [ ] ファイル名前変更が動作
- [ ] モバイルで長押しメニューが動作

---

### Phase 5: Markdown エディタ (Week 8-9)

#### 実装内容

1. **エディタ選定**
   - Novel 2.0 (検討)
   - または TipTap 直接統合

2. **タブ管理**
   - マルチタブ対応
   - タブ切り替え
   - isDirty 管理

3. **保存機能**
   - PC: Ctrl/Cmd + S
   - モバイル: FAB

#### 設計のポイント

**EditorContainer**:
```typescript
export function EditorContainer() {
  const { isMobile } = useResponsive()
  const { openTabs, activeTab } = useEditorStore()
  const { save, isSaving } = useSaveFile()

  const editorProps = useMemo(() => ({
    className: isMobile
      ? 'prose prose-sm max-w-none px-4 py-4'
      : 'prose prose-lg max-w-none px-8 py-6',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[60vh]'
      }
    }
  }), [isMobile])

  return (
    <EditorPresenter
      isMobile={isMobile}
      tabs={openTabs}
      activeTab={activeTab}
      editorProps={editorProps}
      onSave={save}
      isSaving={isSaving}
    />
  )
}
```

**FloatingActionButton (モバイル)**:
```typescript
export function FloatingActionButton({
  isDirty,
  onSave,
  onClose
}: FABProps) {
  return (
    <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-50">
      {/* Save Button */}
      {isDirty && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg"
          onClick={onSave}
        >
          <Save className="w-6 h-6" />
        </motion.button>
      )}

      {/* Close Button */}
      <button
        className="w-12 h-12 bg-gray-600 text-white rounded-full shadow-lg"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
```

#### マイルストーン
- [ ] エディタが動作
- [ ] タブ切り替えが動作
- [ ] 保存が動作（PC: ショートカット、モバイル: FAB）
- [ ] モバイルで快適に編集できる

---

### Phase 6: RAG パネル (Week 10)

#### 実装内容

1. **Search タブ**
   - セマンティック検索
   - 結果表示

2. **Sync タブ**
   - 非同期ジョブ
   - ポーリング
   - 履歴表示

3. **Chat タブ**（オプション）

#### 設計のポイント

**モバイル: ボトムシート**:
```typescript
export function RAGBottomSheet() {
  const [isOpen, setIsOpen] = useState(false)
  const [height, setHeight] = useState(0.7) // 70%

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button className="fixed bottom-20 left-6 w-14 h-14 bg-purple-600 rounded-full">
          <Search />
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="h-[70vh] rounded-t-2xl"
      >
        <RAGPanelContent />
      </SheetContent>
    </Sheet>
  )
}
```

**PC: 右パネル**:
```typescript
export function RAGRightPanel() {
  const { isOpen } = useRAGPanelStore()
  const { width, handleResize } = useResize(400, 300, 800)

  if (!isOpen) return null

  return (
    <ResizablePanel
      position="right"
      width={width}
      onResize={handleResize}
    >
      <RAGPanelContent />
    </ResizablePanel>
  )
}
```

#### マイルストーン
- [ ] RAG検索が動作
- [ ] 同期が動作
- [ ] モバイル: ボトムシート、PC: 右パネルで動作

---

### Phase 7: 最適化とテスト (Week 11-12)

#### 実装内容

1. **パフォーマンス最適化**
   - React.memo 適用
   - useMemo/useCallback 適用
   - 遅延読み込み

2. **アクセシビリティ**
   - ARIA 属性
   - キーボードナビゲーション
   - スクリーンリーダー対応

3. **テスト**
   - E2Eテスト (Playwright)
   - コンポーネントテスト (Jest + RTL)
   - モバイルテスト

4. **ドキュメント**
   - README更新
   - コンポーネントカタログ (Storybook)

#### マイルストーン
- [ ] Lighthouse スコア: モバイル 90+、デスクトップ 95+
- [ ] 主要フローのE2Eテスト完了
- [ ] アクセシビリティチェック完了
- [ ] ドキュメント完備

---

## 移行戦略

### 段階的デプロイ

```
# Phase 1-2: 開発環境のみ
frontend/ (V2) - localhost:3000

# Phase 3: Vercel Preview デプロイ
frontend-v2.vercel.app (テスト環境)

# Phase 4: ベータテスト
beta.your-app.com → frontend/ (V2)
app.your-app.com → reference_v2/ (V1) (フォールバック)

# Phase 5: 完全移行
app.your-app.com → frontend/ (V2)
reference_v2/ → アーカイブ
```

### ロールバックプラン

```bash
# 問題が発生した場合
cd /Users/estyle-0170/Environment/test/2025/09/prj_text_editor_rag_v1

# V2を一時退避
mv frontend frontend_v2_backup

# V1に戻す
cp -r reference_v2 frontend

# Vercel 再デプロイ
vercel --prod
```

---

## 成功指標

### 機能要件
- [ ] すべてのV1機能が実装されている
- [ ] モバイルで全機能が使える
- [ ] PC/モバイルでUXが最適化されている

### 非機能要件
- [ ] Lighthouse スコア: モバイル 90+、PC 95+
- [ ] FCP < 1.5s、LCP < 2.5s
- [ ] バンドルサイズ < 500KB (gzipped)
- [ ] すべてのファイルが 200行以内

### コード品質
- [ ] TypeScript strict mode
- [ ] ESLint エラー 0
- [ ] テストカバレッジ 70%+
- [ ] Container/Presenter パターン適用率 100%

---

## リスク管理

### 主なリスク

1. **開発期間の延長**
   - **対策**: MVP を先に完成させる（Phase 5まで）
   - **代替案**: 重要でない機能は Phase 7 に延期

2. **予期しない技術的問題**
   - **対策**: 各フェーズでプロトタイプを作成
   - **代替案**: reference_v2 のコードを参照

3. **Novel 2.0 の不具合**
   - **対策**: Novel 1.0 を使用（reference_v2 と同じ）
   - **代替案**: TipTap を直接使用

4. **モバイルでのパフォーマンス問題**
   - **対策**: 早期にモバイル実機テスト
   - **代替案**: 機能を段階的に有効化

---

## タイムライン

| Week | Phase | 主な成果物 |
|------|-------|----------|
| 1 | Phase 0 | セットアップ完了 |
| 2 | Phase 1 | 認証システム完成 |
| 3 | Phase 2 | リポジトリ選択完成 |
| 4-5 | Phase 3 | ワークスペースレイアウト完成 |
| 6-7 | Phase 4 | ファイル操作完成 |
| 8-9 | Phase 5 | エディタ完成 |
| 10 | Phase 6 | RAG パネル完成 |
| 11-12 | Phase 7 | 最適化・テスト完了 |

**総期間**: 12週間（約3ヶ月）

---

## 次のステップ

### 即座に実行すべきこと

```bash
# 1. 現在の frontend を reference_v2 に移動
cd /Users/estyle-0170/Environment/test/2025/09/prj_text_editor_rag_v1
mv frontend reference_v2

# 2. reference_v2 の README 作成
cat > reference_v2/README.md << 'EOF'
# Reference V2 (旧フロントエンド)
このディレクトリは V2 リビルド前の参照用コードです。
作成日: 2025年10月5日
ステータス: Reference Only
EOF

# 3. 新しい Next.js プロジェクト作成
npx create-next-app@latest frontend --typescript --tailwind --app

# 4. Git commit
git add .
git commit -m "Archive V1 as reference_v2, prepare for V2 rebuild"
```

### 検討事項

- [ ] V2 のブランチ戦略（`main` vs `v2-rebuild`）
- [ ] Vercel のプロジェクト設定（別プロジェクト vs 同じプロジェクト）
- [ ] データベース移行の必要性（なし、同じSupabaseを使用）
- [ ] API 互換性（backend は変更なし）

---

## まとめ

### なぜリビルドが最適か

1. **技術的負債の解消**: 現在のコードをリファクタリングするより、ゼロから作る方が速い
2. **モバイル対応**: 最初から組み込むことで、一貫性のあるUXを実現
3. **保守性**: Container/Presenter パターンで、将来の変更が容易
4. **学習**: reference_v2 があるため、既存のロジックを参照可能
5. **リスク低減**: いつでも V1 に戻せる

### 期待される効果

- ✅ **開発速度**: 長期的には 2-3倍速く開発できる
- ✅ **バグ減少**: クリーンなアーキテクチャでバグが減る
- ✅ **ユーザー体験**: モバイル/PC で最適なUX
- ✅ **コード品質**: すべてのファイルが 200行以内

---

**作成日**: 2025年10月5日
**想定期間**: 12週間
**承認待ち**: ユーザー承認後、Phase 0 を開始
