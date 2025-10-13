# File/Folder Deletion Implementation Plan

## Overview
ファイル/フォルダを右クリックメニューから削除する機能を実装する。

## Implementation Phases

### Phase 1: Context Menu UI Component
右クリックメニューのUI実装

#### 1.1 ContextMenuコンポーネント作成
**File**: `frontend/src/components/molecules/ContextMenu/ContextMenu.tsx`

**機能**:
- 右クリック位置に表示されるメニュー
- メニューアイテム（Delete, Rename, etc.）
- 画面外にはみ出さないように位置調整
- クリック外でメニューを閉じる

**Props**:
```typescript
interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

interface ContextMenuItem {
  label: string
  icon?: ReactNode
  onClick: () => void
  danger?: boolean  // 削除など危険な操作
  disabled?: boolean
}
```

#### 1.2 SidebarStoreにContextMenu状態追加
**File**: `frontend/src/stores/sidebarStore.ts`

**追加する状態**:
```typescript
interface SidebarState {
  // 既存のフィールド...

  contextMenu: {
    x: number
    y: number
    targetPath: string
    targetType: 'file' | 'dir'
  } | null

  setContextMenu: (menu: ContextMenu | null) => void
  closeContextMenu: () => void
}
```

#### 1.3 FileTreeItemに右クリックハンドラー追加
**File**: `frontend/src/components/organisms/Sidebar/FileTreeItem.tsx`

**追加する機能**:
- `onContextMenu`イベントハンドラー
- デフォルトのブラウザメニューを防止
- クリック位置とファイル情報をstoreに保存

### Phase 2: Delete API Implementation

#### 2.1 GitHub API エンドポイント作成
**File**: `frontend/src/app/api/github/delete-file/route.ts`

**機能**:
- ファイル/フォルダの削除（GitHub API使用）
- フォルダの場合は再帰的に削除
- 認証チェック
- エラーハンドリング

**Request**:
```typescript
interface DeleteFileRequest {
  owner: string
  repo: string
  path: string
  type: 'file' | 'dir'
  message?: string  // コミットメッセージ
}
```

**Response**:
```typescript
interface DeleteFileResponse {
  success: boolean
  path: string
  error?: string
}
```

**GitHub API フロー**:
1. ファイルの場合: 単一ファイル削除
   - `GET /repos/{owner}/{repo}/contents/{path}` でSHA取得
   - `DELETE /repos/{owner}/{repo}/contents/{path}` で削除

2. フォルダの場合: 再帰的削除
   - `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` でツリー取得
   - 該当パス配下の全ファイルを取得
   - 各ファイルのSHAを取得
   - バッチで削除するか、Git Tree APIを使用

#### 2.2 useDeleteFileカスタムフック作成
**File**: `frontend/src/hooks/useDeleteFile.ts`

**機能**:
- API呼び出しのラッパー
- ローディング状態管理
- エラーハンドリング

```typescript
export function useDeleteFile() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteFile = async (params: DeleteFileParams) => {
    // API呼び出し実装
  }

  return { deleteFile, isDeleting, error }
}
```

### Phase 3: Delete Confirmation Dialog

#### 3.1 確認ダイアログコンポーネント作成
**File**: `frontend/src/components/molecules/ConfirmDialog/ConfirmDialog.tsx`

**機能**:
- 削除前の確認ダイアログ
- ファイル/フォルダ名の表示
- フォルダの場合は再帰削除の警告
- Confirm/Cancelボタン

**Props**:
```typescript
interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}
```

#### 3.2 削除フロー統合

**ユーザーフロー**:
1. ファイル/フォルダを右クリック
2. Context Menuが表示される
3. "Delete"メニューをクリック
4. 確認ダイアログが表示される
5. "Confirm"をクリック
6. API呼び出しで削除実行
7. 成功したらファイル一覧を更新
8. エディタで開いていた場合はタブを閉じる

### Phase 4: Integration & Error Handling

#### 4.1 エディタとの統合
- 削除されたファイルがエディタで開いている場合、タブを自動クローズ
- `editorStore`の`closeTab`メソッドを使用

#### 4.2 エラーハンドリング
- API エラー時のトースト通知
- 権限エラー（403）の適切な表示
- ネットワークエラーのリトライ提案

#### 4.3 UX改善
- 削除中のローディング表示
- 削除成功のトースト通知
- ファイル一覧の即座更新（オプティミスティックUI）

## Additional Features (Optional)

### Context Menu拡張
将来的に以下の機能も追加可能:
- Rename（名前変更）
- Copy Path（パスをコピー）
- Duplicate（複製）
- Download（ダウンロード）
- Open in GitHub（GitHubで開く）

### キーボードショートカット
- Delete key: 選択中のファイル/フォルダを削除
- Shift+Delete: 確認なしで削除（上級者向け）

## Technical Notes

### GitHub API制限
- フォルダの再帰削除は複数のAPI呼び出しが必要
- Rate limitに注意
- 大きなフォルダの削除は時間がかかる可能性

### セキュリティ考慮事項
- 削除操作は元に戻せない
- 確認ダイアログは必須
- ユーザーの権限チェック

### パフォーマンス
- 削除後のファイルリスト更新は`refetch()`を使用
- オプティミスティックUIでUX向上（optional）

## Implementation Order

1. **Phase 1** (UI): ContextMenu + FileTreeItem統合
2. **Phase 3** (Dialog): 確認ダイアログ作成
3. **Phase 2** (API): 削除API実装
4. **Phase 4** (Integration): 全体統合とエラーハンドリング

この順序で実装することで、各フェーズで動作確認が可能。
