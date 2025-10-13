# 37_REFERENCE_V1_EDITOR_ANALYSIS.md

## Overview

reference_v1プロジェクトのエディタ実装を詳細分析し、今後の実装に参考となる技術スタック、コンポーネント構成、実装パターンを調査・記録。

## 技術スタック分析

### 主要ライブラリ

```json
{
  "@codemirror/lang-markdown": "^6.3.4",    // Markdown言語サポート
  "@codemirror/merge": "^6.10.2",           // Diff表示・マージ機能
  "@codemirror/state": "^6.5.2",            // エディタ状態管理
  "@codemirror/view": "^6.38.2",             // エディタビュー層
  "@uiw/react-codemirror": "^4.25.1"        // React wrapper
}
```

### エディタ選択の比較

| 項目 | CodeMirror 6 | Monaco Editor |
|------|--------------|---------------|
| **バンドルサイズ** | 軽量（～200KB） | 重量（～2MB） |
| **カスタマイズ** | 高い柔軟性 | 制限的 |
| **言語サポート** | モジュール式 | 豊富（内蔵） |
| **VSCode互換** | 部分的 | 完全 |
| **学習コスト** | 中程度 | 低い |
| **実績** | reference_v1で採用 | 一般的 |

**結論**: reference_v1の実績とバンドルサイズの観点からCodeMirror 6を採用

## コンポーネント構成分析

### 1. MarkdownEditor.tsx

```typescript
// ベースコンポーネント
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  showDiff?: boolean;        // AI差分表示モード
  diffLines?: DiffLine[];    // 差分データ
  onApplyDiff?: () => void;  // 差分適用
  onRejectDiff?: () => void; // 差分拒否
}
```

**主要特徴:**
- **二重モード**: 通常編集 / AI差分表示
- **カスタムテーマ**: EditorView.theme()でスタイル制御
- **豊富な設定**: basicSetup で多数の機能有効化

**エディタ設定:**
```typescript
basicSetup={{
  lineNumbers: true,
  highlightActiveLineGutter: true,
  highlightSpecialChars: true,
  history: true,
  foldGutter: true,              // 折りたたみ
  drawSelection: true,
  dropCursor: true,
  allowMultipleSelections: true,
  indentOnInput: true,
  syntaxHighlighting: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: true,
  rectangularSelection: true,
  highlightSelectionMatches: true,
  searchKeymap: true,
  completionKeymap: true,
  lintKeymap: true,
}}
```

### 2. FileExplorer.tsx

```typescript
interface FileItem {
  id: string;
  repository_id: string;
  path: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  github_sha?: string;
}

interface FileExplorerProps {
  onFileSelect: (file: FileItem) => void;
  selectedPath?: string;
  selectedRepository?: any;
}
```

**実装パターン:**
1. **フラット→ツリー変換**: Supabaseのフラット構造からVSCode風ツリー構築
2. **状態管理**: `useState<Set<string>>` で展開フォルダ管理
3. **TanStack Query**: `useFiles()` でデータ取得
4. **再帰レンダリング**: ネストした構造の表示

**ツリー構築ロジック:**
```typescript
const fileTree = useMemo(() => {
  const tree: any = { '/': { type: 'folder', name: '/', path: '/', children: {} } }

  files.forEach(file => {
    const pathParts = file.path.split('/').filter(p => p)
    let currentLevel = tree['/'].children
    let currentPath = ''

    // ネスト構造を構築
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath += '/' + pathParts[i]
      if (!currentLevel[pathParts[i]]) {
        currentLevel[pathParts[i]] = {
          type: 'folder',
          name: pathParts[i],
          path: currentPath,
          children: {}
        }
      }
      currentLevel = currentLevel[pathParts[i]].children
    }
  })

  return tree
}, [files])
```

### 3. Auto-Save機能（useAutoSave.ts）

```typescript
interface UseAutoSaveReturn {
  saveStatus: SaveStatus;      // 'saved' | 'saving' | 'unsaved'
  lastSaved: Date | null;
  save: () => Promise<void>;
  hasUnsavedChanges: boolean;
}

export function useAutoSave(
  content: string,
  onSave?: (content: string) => Promise<void> | void,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn
```

**実装特徴:**
1. **デバウンス**: 300ms遅延での自動保存
2. **TanStack Query**: `useMutation`で非同期保存
3. **二重保存**: localStorage + カスタム保存関数
4. **楽観的更新**: 保存前にUI状態更新
5. **ページ離脱対応**: `beforeunload`イベントでの緊急保存

**デバウンスロジック:**
```typescript
useEffect(() => {
  if (content === lastSavedContentRef.current) return;

  setHasUnsavedChanges(true);

  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }

  timeoutRef.current = setTimeout(() => {
    save();
  }, delay); // 300ms

  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, [content, save, delay]);
```

## UI/UXパターン分析

### レイアウト構成

**3カラムレイアウト:**
```
┌──────────────┬──────────────┬──────────────┐
│ FileExplorer │ MarkdownEditor│ MarkdownPreview│
│              │              │              │
│ - VSCode風   │ - CodeMirror │ - ライブ     │
│ - ツリー表示 │ - Diff表示   │   プレビュー │
│ - 展開/折畳  │ - 自動保存   │              │
└──────────────┴──────────────┴──────────────┘
```

**レイアウト実装詳細:**
```typescript
// app/page.tsx のレイアウト構造
<div className="flex h-screen bg-gray-100">
  {/* Left Sidebar - FileExplorer */}
  <div className="w-80 border-r border-gray-300 bg-white overflow-hidden">
    <FileExplorer
      onFileSelect={handleFileSelect}
      selectedPath={selectedFile?.path}
      selectedRepository={selectedRepository}
    />
  </div>

  {/* Main Content Area - フレックス分割 */}
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* Editor Section */}
    <div className="flex-1 flex overflow-hidden">
      {/* MarkdownEditor - フル高さ */}
      <div className="flex-1 border-r border-gray-300">
        <MarkdownEditor
          value={content}
          onChange={setContent}
          showDiff={showDiff}
          diffLines={diffLines}
          onApplyDiff={handleApplyDiff}
          onRejectDiff={handleRejectDiff}
        />
      </div>

      {/* MarkdownPreview - トグル可能 */}
      {showPreview && (
        <div className="flex-1 bg-white overflow-auto">
          <MarkdownPreview content={content} />
        </div>
      )}
    </div>
  </div>
</div>
```

**CodeMirror高さ設定:**
```typescript
// components/MarkdownEditor.tsx
<CodeMirror
  value={value}
  height="calc(100vh - 73px)" // フル画面高さから上部マージン分を除外
  extensions={[
    markdown(),
    EditorView.theme({
      '&': {
        fontSize: '14px',
        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      },
      '.cm-focused': {
        outline: 'none',
      },
    }),
  ]}
  basicSetup={{
    lineNumbers: true,
    highlightActiveLineGutter: true,
    // ... 豊富な設定
  }}
/>
```

**レスポンシブ調整:**
```typescript
// 画面サイズによる動的調整
const [sidebarWidth, setSidebarWidth] = useState(320)
const [showPreview, setShowPreview] = useState(true)

// 小画面では自動でプレビューを非表示
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth < 1200) {
      setShowPreview(false)
    }
  }

  window.addEventListener('resize', handleResize)
  return () => window.removeEventListener('resize', handleResize)
}, [])

### エディタUI詳細

**ヘッダー情報表示:**
- ファイルパス表示
- 言語バッジ（TypeScript、Markdown等）
- ファイルサイズ表示

**差分表示モード:**
```typescript
// AI提案時の差分UI
{showDiff && (
  <div className="bg-yellow-50 border-b border-yellow-200">
    <span className="text-yellow-800">AI suggested changes</span>
    <button onClick={onRejectDiff}>Reject</button>
    <button onClick={onApplyDiff}>Apply Changes</button>
  </div>
)}
```

**行番号とガター:**
```typescript
'.cm-gutters': {
  backgroundColor: '#f9fafb',
  borderRight: '1px solid #e5e7eb',
}
```

## データフロー分析

### ファイル選択→編集フロー

```
1. FileExplorer.onFileSelect()
   ↓
2. useFiles() / useFileContent()
   ↓
3. MarkdownEditor.value 更新
   ↓
4. useAutoSave() デバウンス開始
   ↓
5. onSave() → API呼び出し
   ↓
6. TanStack Query mutation
   ↓
7. Supabase & GitHub API更新
```

### 状態管理パターン

**グローバル状態:**
- 認証状態: `useAuth()`
- アクティブリポジトリ: `useActiveRepository()`
- ファイル一覧: `useFiles()`

**ローカル状態:**
- エディタ内容: `useState<string>`
- 選択ファイル: `useState<FileItem>`
- 展開フォルダ: `useState<Set<string>>`

## パフォーマンス最適化

### メモ化パターン

```typescript
// ファイルツリー構築の最適化
const fileTree = useMemo(() => {
  // 重い計算処理
}, [files])

// コールバック最適化
const handleChange = useCallback((val: string) => {
  if (!showDiff) {
    onChange(val);
  }
}, [onChange, showDiff]);
```

### TanStack Query活用

```typescript
// キャッシュ戦略
const { data: files = [], isLoading, error } = useFiles(selectedRepository)

// mutation による楽観的更新
const updateFileMutation = useUpdateFile();
```

## エラーハンドリング

### 保存失敗時の対応

```typescript
onError: (error) => {
  console.error('Save failed:', error);
  // LocalStorageへのフォールバック保存は継続
}
```

### ファイル読み込み失敗

```typescript
if (error) {
  return (
    <div className="text-red-500">
      <p>Failed to load file</p>
      <p>{error}</p>
    </div>
  )
}
```

## 新プロジェクトへの適用計画

### 採用する設計パターン

1. **CodeMirror 6**: エディタベース
2. **3カラムレイアウト**: UI構成
3. **デバウンス自動保存**: UXパターン
4. **TanStack Query**: データフェッチ
5. **ツリー構造構築**: ファイル表示ロジック

### 変更点

1. **データソース**: Supabase → GitHub API直接
2. **認証**: reference_v1のまま（Supabase Auth）
3. **同期**: 複雑な同期ロジック削除
4. **言語サポート**: Markdown以外も対応

### 実装優先順位

**Phase 1: 基本エディタ**
1. CodeMirror 6 セットアップ
2. ファイル選択→表示機能
3. 基本的な編集機能

**Phase 2: 自動保存**
1. useAutoSave フック実装
2. GitHub API保存連携
3. 保存状態インジケーター

**Phase 3: UI強化**
1. 言語別ハイライト
2. ファイルアイコン
3. エラーハンドリング強化

## 技術的推奨事項

### パッケージ構成

```json
{
  "@codemirror/commands": "^6.x",
  "@codemirror/lang-javascript": "^6.x",
  "@codemirror/lang-markdown": "^6.x",
  "@codemirror/state": "^6.x",
  "@codemirror/view": "^6.x",
  "@uiw/react-codemirror": "^4.x"
}
```

### 設定推奨値

```typescript
// デバウンス設定
const AUTOSAVE_DELAY = 300; // ms

// エディタ設定
const EDITOR_FONT_SIZE = 14; // px
const EDITOR_TAB_SIZE = 2;   // spaces

// UI設定
const TREE_INDENT = 16; // px
```

### ファイル構成推奨

```
components/
├── editor/
│   ├── CodeEditor.tsx      // CodeMirror wrapper
│   ├── FileExplorer.tsx    // VSCode風ツリー
│   └── SaveIndicator.tsx   // 保存状態表示
├── hooks/
│   ├── useAutoSave.ts      // 自動保存
│   ├── useFileContent.ts   // ファイル内容取得
│   └── useFileTree.ts      // ツリー構造管理
└── stores/
    └── editorStore.ts      // エディタ状態管理
```

## 結論

reference_v1の実装は非常に参考になる設計が多数確認できました。特にCodeMirror 6の活用方法、自動保存の実装パターン、ファイルツリーの構築ロジックは新プロジェクトでそのまま活用可能です。

主要な違いは、データソースをSupabaseからGitHub API直接に変更する点のみで、UI/UXパターンとコンポーネント設計はそのまま採用できます。