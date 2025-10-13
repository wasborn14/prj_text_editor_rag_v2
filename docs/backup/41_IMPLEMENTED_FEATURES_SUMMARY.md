# 実装済み機能まとめ

このドキュメントは、最近実装された機能の概要をまとめたものです。

## 1. ファイル/フォルダ作成機能

### 概要
サイドバーからファイルやフォルダを作成できる機能。VSCodeライクなUXを提供。

### 実装内容

#### UI コンポーネント
- **CreateFileInput** (`frontend/src/components/molecules/CreateFileInput/CreateFileInput.tsx`)
  - インライン入力フィールド
  - リアルタイムバリデーション
  - Enter で確定、Escape でキャンセル
  - 自動フォーカス

#### 機能
- **SidebarHeader** にファイル/フォルダ作成ボタン（FilePlus, FolderPlus）
- 選択中のディレクトリ内に作成
- ディレクトリが閉じている場合、作成時に自動的に展開
- ファイル作成時、拡張子がない場合は自動的に `.md` を追加

#### バリデーション
- 空の名前を禁止
- 無効な文字（`/\:*?"<>|`）をチェック
- ドットで始まる名前を禁止（`.gitkeep` 除く）
- 255文字制限

#### API エンドポイント
- **POST** `/api/github/create-file`
  - ファイル作成: 直接作成
  - フォルダ作成: `.gitkeep` ファイルを含むフォルダを作成

#### 関連ファイル
```
frontend/src/components/molecules/CreateFileInput/CreateFileInput.tsx
frontend/src/components/organisms/Sidebar/SidebarHeader.tsx
frontend/src/components/organisms/Sidebar/Sidebar.tsx
frontend/src/components/organisms/Sidebar/SidebarContent.tsx
frontend/src/components/organisms/Sidebar/FileTreeItem.tsx
frontend/src/stores/sidebarStore.ts
frontend/src/hooks/useCreateFile.ts
frontend/src/app/api/github/create-file/route.ts
```

---

## 2. ファイル/フォルダ削除機能

### 概要
右クリックメニューからファイルやフォルダを削除できる機能。確認ダイアログとローディング表示を実装。

### 実装内容

#### UI コンポーネント
- **ContextMenu** (`frontend/src/components/molecules/ContextMenu/ContextMenu.tsx`)
  - 右クリック位置に表示
  - 画面外にはみ出さないように自動調整
  - クリック外で自動的に閉じる
  - Escape キーで閉じる

- **ConfirmDialog** (`frontend/src/components/molecules/ConfirmDialog/ConfirmDialog.tsx`)
  - 削除前の確認ダイアログ
  - フォルダ削除時は警告メッセージ表示
  - ローディング中はボタンを無効化
  - スピナーアイコン表示

#### 機能
- ファイル/フォルダを右クリックで「Delete」メニュー表示
- 削除確認ダイアログ
- 削除中のローディング表示（"Deleting..."）
- 削除後、エディタで開いていたタブを自動クローズ
- ファイルリストの自動更新

#### API エンドポイント
- **DELETE** `/api/github/delete-file`
  - ファイル削除: 単一ファイル削除
  - フォルダ削除: 再帰的に全ファイルを削除

#### ユーザーフロー
1. ファイル/フォルダを右クリック
2. 「Delete」をクリック
3. 確認ダイアログで「Delete」をクリック
4. ローディング表示
5. 削除完了後、ファイルリストが更新される

#### 関連ファイル
```
frontend/src/components/molecules/ContextMenu/ContextMenu.tsx
frontend/src/components/molecules/ConfirmDialog/ConfirmDialog.tsx
frontend/src/components/organisms/Sidebar/Sidebar.tsx
frontend/src/components/organisms/Sidebar/FileTreeItem.tsx
frontend/src/stores/sidebarStore.ts (contextMenu state)
frontend/src/hooks/useDeleteFile.ts
frontend/src/app/api/github/delete-file/route.ts
```

---

## 3. ディレクトリ選択機能

### 概要
ディレクトリをクリックして選択状態にする機能。選択中のディレクトリ内にファイル/フォルダを作成可能。

### 実装内容

#### 機能
- ディレクトリクリック時に選択状態（青いハイライト）になる
- ディレクトリクリックで展開/折りたたみ
- 選択中のディレクトリに基づいて作成先を決定
- 閉じているディレクトリを選択してファイル/フォルダ作成ボタンを押すと、自動的に展開

#### 修正内容
- **FileTreeItem**: ディレクトリクリック時にも `onSelect(node)` を呼び出し
- **SidebarHeader**: 選択中のディレクトリが閉じている場合、作成時に `expandFolder` を実行
- **子要素の選択状態**: `selectedFilePath` を子要素にも渡して正しく選択状態を反映

#### 関連ファイル
```
frontend/src/components/organisms/Sidebar/FileTreeItem.tsx
frontend/src/components/organisms/Sidebar/SidebarHeader.tsx
frontend/src/components/organisms/Sidebar/SidebarContent.tsx
```

---

## 4. UI/UX 改善

### .gitkeep ファイルの非表示
- フォルダ作成時に `.gitkeep` ファイルが作成される（Git用）
- サイドバーでは `.gitkeep` を非表示
- ユーザーにはシンプルなファイルツリーを表示

### ファイルサイズ表示の削除
- サイドバーのファイルサイズ表示を削除
- よりシンプルな表示

### 削除確認ダイアログの背景
- オーバーレイの透明度を調整（`bg-gray-500/30`）
- より薄い背景色でダイアログを表示

### 拡張子の自動追加
- ファイル作成時、拡張子がない場合は自動的に `.md` を追加
- すでに拡張子がある場合はそのまま（`.txt`, `.json` など）

---

## 技術スタック

### フロントエンド
- **React** (Next.js App Router)
- **TypeScript**
- **Zustand** (状態管理)
- **Tailwind CSS** (スタイリング)
- **Lucide React** (アイコン)

### バックエンド
- **Next.js API Routes**
- **GitHub API** (ファイル操作)
- **Supabase** (認証)

---

## 状態管理

### SidebarStore (`frontend/src/stores/sidebarStore.ts`)

```typescript
interface SidebarState {
  // 既存の状態
  isVisible: boolean
  width: number
  viewMode: ViewMode
  pinnedFiles: string[]
  expandedFolders: Set<string>

  // ファイル/フォルダ作成
  creatingItem: {
    type: 'file' | 'folder'
    parentPath: string
  } | null

  // コンテキストメニュー
  contextMenu: {
    x: number
    y: number
    targetPath: string
    targetType: 'file' | 'dir'
  } | null

  // アクション
  setCreatingItem: (item) => void
  cancelCreating: () => void
  setContextMenu: (menu) => void
  closeContextMenu: () => void
  expandFolder: (path: string) => void
}
```

---

## API エンドポイント

### ファイル作成
**POST** `/api/github/create-file`

**Request:**
```json
{
  "owner": "username",
  "repo": "repository",
  "path": "path/to/file.md",
  "content": "# New File\n\nStart editing...",
  "type": "file"
}
```

**Response:**
```json
{
  "success": true,
  "path": "path/to/file.md",
  "sha": "abc123...",
  "type": "file"
}
```

### フォルダ作成
**POST** `/api/github/create-file`

**Request:**
```json
{
  "owner": "username",
  "repo": "repository",
  "path": "path/to/folder",
  "type": "folder"
}
```

内部的に `path/to/folder/.gitkeep` ファイルが作成される。

### ファイル削除
**DELETE** `/api/github/delete-file`

**Request:**
```json
{
  "owner": "username",
  "repo": "repository",
  "path": "path/to/file.md",
  "type": "file"
}
```

**Response:**
```json
{
  "success": true,
  "path": "path/to/file.md",
  "type": "file"
}
```

### フォルダ削除
**DELETE** `/api/github/delete-file`

**Request:**
```json
{
  "owner": "username",
  "repo": "repository",
  "path": "path/to/folder",
  "type": "dir"
}
```

内部的にフォルダ内の全ファイルを再帰的に削除。

**Response:**
```json
{
  "success": true,
  "path": "path/to/folder",
  "type": "dir",
  "deletedFiles": 5
}
```

---

## セキュリティ考慮事項

### 認証
- すべてのAPI操作はSupabase認証を必須
- GitHub Personal Access Token を使用
- セッション検証

### バリデーション
- ファイル名の無効文字チェック
- パストラバーサル攻撃の防止
- 文字数制限

### GitHub API
- ユーザーの権限に基づいて操作が制限される
- プライベートリポジトリへのアクセスはトークンの権限次第

---

## 今後の改善案

### エラーハンドリング
- トースト通知の実装
- より詳細なエラーメッセージ
- リトライ機能

### パフォーマンス
- オプティミスティックUI（削除前にUIを更新）
- ファイル作成時のキャッシュ更新

### 追加機能
- ファイル/フォルダのリネーム
- ファイル/フォルダの移動（ドラッグ&ドロップ）
- 複数選択と一括削除
- ファイルの複製
- パスのコピー
- GitHubで開く

### キーボードショートカット
- Delete キー: 選択中のファイル/フォルダを削除
- F2 キー: リネーム
- Ctrl/Cmd + N: 新規ファイル
- Ctrl/Cmd + Shift + N: 新規フォルダ

---

## ドキュメント

関連するドキュメント:
- [39_FILE_FOLDER_CREATION_PLAN.md](./39_FILE_FOLDER_CREATION_PLAN.md) - ファイル/フォルダ作成の実装計画
- [40_FILE_DELETION_PLAN.md](./40_FILE_DELETION_PLAN.md) - ファイル/フォルダ削除の実装計画
