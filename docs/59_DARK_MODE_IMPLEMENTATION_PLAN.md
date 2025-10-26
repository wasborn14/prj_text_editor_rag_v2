# ダークモード実装プラン

## 概要

アプリケーション全体にダークモード機能を追加し、ユーザーがライト/ダークテーマを切り替えられるようにする。

## 実装ステップ

### 1. ダークモード状態管理の実装

**ファイル**: `frontend/src/stores/themeStore.ts`

```typescript
import { create } from 'zustand'

interface ThemeStore {
  isDarkMode: boolean
  toggleTheme: () => void
  setTheme: (isDark: boolean) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDarkMode: false,
  toggleTheme: () => set((state) => {
    const newMode = !state.isDarkMode
    localStorage.setItem('theme', newMode ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light')
    return { isDarkMode: newMode }
  }),
  setTheme: (isDark) => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    set({ isDarkMode: isDark })
  }
}))
```

**機能**:
- `isDarkMode`: 現在のテーマ状態
- `toggleTheme()`: ライト/ダークを切り替え
- `setTheme(isDark)`: テーマを直接設定
- localStorage に保存して永続化
- `document.documentElement` に `data-theme` 属性を設定

### 2. ダークモードトグルボタンをヘッダーに追加

**ファイル**: `frontend/src/components/layout/dashboard/DashboardHeader.tsx`

```typescript
import { useThemeStore } from '@/stores/themeStore'
import { Moon, Sun } from 'lucide-react'

// コンポーネント内に追加
const { isDarkMode, toggleTheme } = useThemeStore()

// ボタン
<button
  onClick={toggleTheme}
  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
  aria-label="Toggle theme"
>
  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
</button>
```

**配置**: 右上のユーザーアイコンの隣

### 3. globals.css にダークモードのCSS変数とスタイルを追加

**ファイル**: `frontend/src/app/globals.css`

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  --border: #e5e7eb;
  --hover: #f3f4f6;
}

[data-theme="dark"] {
  --background: #0a0a0a;
  --foreground: #ededed;
  --border: #374151;
  --hover: #1f2937;
}

/* TipTap editor links - dark mode support */
[data-theme="dark"] .ProseMirror a {
  color: #60a5fa;
}

[data-theme="dark"] .ProseMirror a:hover {
  color: #3b82f6;
}
```

### 4. 各コンポーネントにダークモード対応クラスを追加

#### DashboardHeader
- 背景: `bg-white dark:bg-gray-900`
- テキスト: `text-gray-900 dark:text-gray-100`
- ボーダー: `border-gray-200 dark:border-gray-700`

#### FileTree
- 背景: `bg-white dark:bg-gray-900`
- ホバー: `hover:bg-gray-100 dark:hover:bg-gray-800`
- 選択: `bg-blue-50 dark:bg-blue-900/30`

#### RAGPanel
- 背景: `bg-white dark:bg-gray-900`
- ボーダー: `border-gray-200 dark:border-gray-700`
- タブ: `bg-gray-100 dark:bg-gray-800`

#### FileEditor
- エディタ背景: `bg-white dark:bg-gray-900`
- `.ProseMirror` のテキスト色

### 5. エディタ(TipTap)のダークモードスタイル調整

**globals.css に追加**:

```css
[data-theme="dark"] .ProseMirror {
  color: #ededed;
}

[data-theme="dark"] .ProseMirror h1,
[data-theme="dark"] .ProseMirror h2,
[data-theme="dark"] .ProseMirror h3,
[data-theme="dark"] .ProseMirror h4,
[data-theme="dark"] .ProseMirror h5,
[data-theme="dark"] .ProseMirror h6 {
  color: #f9fafb;
}

[data-theme="dark"] .ProseMirror code {
  background-color: #1f2937;
  color: #f9fafb;
}

[data-theme="dark"] .ProseMirror pre {
  background-color: #111827;
}
```

### 6. ローカルストレージに設定を保存

**初回ロード処理** (`layout.tsx` または専用フック):

```typescript
useEffect(() => {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark)

  setTheme(isDark)
}, [])
```

**機能**:
- localStorage から保存されたテーマを読み込み
- 保存がない場合はシステム設定 (`prefers-color-scheme`) を使用
- 起動時に自動適用

## 技術仕様

### 使用ライブラリ
- Zustand: 状態管理
- Tailwind CSS: `dark:` ユーティリティクラス
- lucide-react: Moon/Sun アイコン

### データフロー
1. ユーザーがトグルボタンをクリック
2. `themeStore.toggleTheme()` を呼び出し
3. localStorage に保存
4. `document.documentElement.dataset.theme` を更新
5. CSS の `[data-theme="dark"]` セレクタが適用される
6. Tailwind の `dark:` クラスが有効化

### 対応範囲
- ✅ ヘッダー
- ✅ サイドバー (FileTree)
- ✅ RAGPanel
- ✅ FileEditor
- ✅ TipTap エディタ
- ✅ モーダル・ダイアログ
- ✅ リンク色

## 実装順序

1. themeStore 作成 → localStorage連携
2. globals.css にダークモード変数追加
3. DashboardHeader にトグルボタン追加
4. 各コンポーネントに `dark:` クラス追加
5. TipTap エディタのスタイル調整
6. 動作確認・微調整

## 参考

- Tailwind Dark Mode: https://tailwindcss.com/docs/dark-mode
- `data-theme` アプローチを使用（class戦略ではなく）
- システム設定との連携でUX向上
