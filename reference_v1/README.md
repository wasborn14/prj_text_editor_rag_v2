# Reference Materials

このディレクトリには、新しいフロントエンド開発時の参考資料が保存されています。

## 📁 構成

### `prj_text_editor_v1/`
- **目的**: 新フロントエンド開発時の参考コード
- **技術**: Next.js 15 + React 19 + TypeScript
- **状態**: 動作確認済み（高機能だが複雑）

## 🔧 参考にできるコンポーネント

### エディター関連
```typescript
// components/MarkdownEditor.tsx
- CodeMirror 6統合
- Markdown シンタックスハイライト
- リアルタイムプレビュー

// components/MarkdownPreview.tsx
- react-markdown使用
- GFM (GitHub Flavored Markdown) 対応
- カスタムスタイリング
```

### UI/UX関連
```typescript
// components/FileExplorer.tsx
- VSCode風ファイルツリー
- 階層表示・展開/折りたたみ

// app/layout.tsx
- 3カラムレイアウト
- レスポンシブ対応
```

### 認証・統合
```typescript
// components/AuthProvider.tsx
- Supabase Auth統合
- GitHub OAuth

// hooks/useAutoSave.tsx
- 自動保存機能
- LocalStorage ↔ Supabase 切り替え
```

## 📦 package.json抜粋

参考になる依存関係：

```json
{
  "dependencies": {
    "@codemirror/lang-markdown": "^6.3.4",
    "@codemirror/state": "^6.5.2",
    "@codemirror/view": "^6.38.2",
    "@uiw/react-codemirror": "^4.25.1",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",
    "lucide-react": "^0.544.0"
  }
}
```

## 🎯 新フロントエンド開発時の活用方法

### Phase 1: 基本エディター
```typescript
// 参考: components/MarkdownEditor.tsx
- CodeMirror 6の基本設定
- Markdown編集機能
- 基本的なスタイリング
```

### Phase 2: RAG統合
```typescript
// 新規作成: components/RAGSearch.tsx
- 検索UI
- VPS RAG API連携 (shared/types/rag.ts使用)
- 結果表示コンポーネント
```

### Phase 3: ファイル管理
```typescript
// 参考: components/FileExplorer.tsx の簡素版
- 基本的なファイルリスト
- GitHub連携（簡素化版）
```

## ⚠️ 注意事項

### 使用推奨
- ✅ CodeMirror 6の設定方法
- ✅ react-markdownの使用法
- ✅ Tailwind CSSスタイリング
- ✅ TypeScript型定義
- ✅ 基本的なUI構成

### 使用非推奨（複雑すぎる）
- ❌ AI diff機能
- ❌ 複雑なGitHub同期
- ❌ マルチテナント対応
- ❌ 複雑な状態管理

## 🚀 開発アプローチ

1. **CodeMirror エディター** - `MarkdownEditor.tsx`を簡素化して流用
2. **RAG検索UI** - 新規作成、UIデザインのみ参考
3. **基本レイアウト** - `layout.tsx`のシンプル版
4. **API連携** - `shared/types/`の型定義活用

---

**作成目的**: フロントエンド開発時の参考資料
**更新日**: 2025年1月20日