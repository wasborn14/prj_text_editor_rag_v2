# RAG検索パネル実装プラン

## 概要

`test-rag`ページで動作確認済みのRAG検索機能を、workspaceの右側サイドパネルとして統合する。reference_v1のAIChatパネルを参考に、より洗練されたUXを提供する。

## 現在の状況

### 動作確認済み
- ✅ VPS RAG API (`http://160.251.211.37/api`) への接続
- ✅ Semantic Search機能
- ✅ RAG Chat機能
- ✅ Repository Sync機能
- ✅ Next.js API Routeによるプロキシ実装

### 既存コンポーネント
- `useRAGSearch` - 検索フック
- `useRAGChat` - チャットフック
- `useRAGSync` - 同期フック
- `/api/rag/search` - 検索APIプロキシ
- `/api/rag/chat` - チャットAPIプロキシ
- `/api/rag/sync` - 同期APIプロキシ

## アーキテクチャ設計

### オプション1: スライドインパネル（推奨）

reference_v1のAIChatを参考に、右側からスライドインするパネル形式

**メリット:**
- エディタとの切り替えがスムーズ
- コンテンツが隠れない
- モバイル対応が容易
- reference_v1との一貫性

**実装:**
```
┌─────────────────────────────────────────────────────┐
│ Header                                              │
├──────┬──────────────────────────────┬──────────────┤
│      │                              │              │
│ Side │      Editor / Tabs           │  RAG Panel   │
│ bar  │                              │  (Slide-in)  │
│      │                              │              │
└──────┴──────────────────────────────┴──────────────┘
```

### オプション2: タブ切り替え方式

エディタとRAG検索を同じ領域でタブ切り替え

**メリット:**
- 画面を広く使える
- シンプルな実装

**デメリット:**
- エディタとRAG検索を同時に見られない
- ワークフローが分断される

### オプション3: ボトムパネル

VS Code風にエディタ下部にパネル表示

**メリット:**
- エディタの横幅を確保
- ターミナル的な使い方

**デメリット:**
- エディタの縦幅が制限される

## 推奨実装: スライドインRAGパネル

### コンポーネント構成

```
frontend/src/components/organisms/
├── RAGPanel/
│   ├── RAGPanel.tsx          # メインパネル
│   ├── RAGSearch.tsx          # 検索タブ
│   ├── RAGChat.tsx            # チャットタブ
│   └── RAGSync.tsx            # 同期タブ
```

### 機能要件

#### 1. パネル制御
- **トグルボタン**: ヘッダーに「🔍 RAG検索」ボタンを追加
- **開閉アニメーション**: Tailwind `transition-transform`
- **リサイズ可能**: ドラッグで幅調整（300px〜600px）
- **状態保持**: Zustand storeで開閉状態を管理

#### 2. タブ構成
- **Search**: Semantic検索
- **Chat**: RAG Chat（コンテキスト付き質問応答）
- **Sync**: リポジトリ同期管理

#### 3. 検索タブ機能
- クエリ入力フィールド
- 検索結果リスト
  - ファイルパス表示
  - スニペット表示（200文字）
  - スコア表示
  - クリックでエディタに表示
- フィルター: リポジトリ選択、結果数制限

#### 4. チャットタブ機能
- メッセージ入力
- 会話履歴表示
- ソース表示（参照元ファイル）
- Markdown対応
- コードブロックシンタックスハイライト

#### 5. 同期タブ機能
- 現在のリポジトリ同期状態表示
- 手動同期トリガー
- 同期履歴表示

### Zustand Store設計

```typescript
// stores/ragPanelStore.ts
interface RAGPanelState {
  isVisible: boolean
  width: number
  activeTab: 'search' | 'chat' | 'sync'

  // Actions
  togglePanel: () => void
  setWidth: (width: number) => void
  setActiveTab: (tab: 'search' | 'chat' | 'sync') => void
}
```

### UIデザイン

#### カラースキーム
- パネル背景: `bg-white`
- タブアクティブ: `bg-purple-50 text-purple-700`
- ボーダー: `border-gray-200`
- アクセント: `purple-600`（RAG機能用の専用色）

#### レイアウト
```tsx
<div className="fixed right-0 top-16 bottom-0 bg-white border-l border-gray-200 shadow-xl transition-transform duration-300">
  {/* Header with Tabs */}
  <div className="border-b border-gray-200">
    <div className="flex">
      <button>Search</button>
      <button>Chat</button>
      <button>Sync</button>
    </div>
  </div>

  {/* Content Area */}
  <div className="flex-1 overflow-auto p-4">
    {/* Tab Content */}
  </div>
</div>
```

## 実装ステップ

### Phase 1: 基本構造
1. ✅ RAGPanelStoreを作成
2. ✅ RAGPanelコンポーネントを作成
3. ✅ workspace/page.tsxに統合
4. ✅ ヘッダーにトグルボタン追加

### Phase 2: 検索タブ
1. ✅ RAGSearchコンポーネント作成
2. ✅ useRAGSearchフックを統合
3. ✅ 検索結果の表示
4. ✅ ファイルクリックでエディタに反映

### Phase 3: チャットタブ
1. ✅ RAGChatコンポーネント作成
2. ✅ useRAGChatフックを統合
3. ✅ メッセージUI実装
4. ✅ ソース表示機能

### Phase 4: 同期タブ
1. ✅ RAGSyncコンポーネント作成
2. ✅ useRAGSyncフックを統合
3. ✅ 同期状態表示
4. ✅ 手動同期機能

### Phase 5: UX改善
1. ✅ リサイズ機能追加
2. ✅ キーボードショートカット（Ctrl+K）
3. ✅ ローディング状態の改善
4. ✅ エラーハンドリング強化

## API仕様

### 検索API
```typescript
POST /api/rag/search
{
  query: string
  repository: string
  limit: number
}

Response:
{
  results: SearchResult[]
  total: number
}
```

### チャットAPI
```typescript
POST /api/rag/chat
{
  message: string
  repository: string
  context_limit: number
}

Response:
{
  answer: string
  sources: Source[]
}
```

### 同期API
```typescript
POST /api/rag/sync
{
  repository: string
}

Response:
{
  status: string
  message: string
  files_synced: number
}
```

## セキュリティ考慮事項

1. **認証**: Supabase認証チェック必須
2. **APIキー**: サーバーサイドで管理（環境変数）
3. **レート制限**: API呼び出し頻度制限
4. **入力検証**: XSS対策、インジェクション対策

## パフォーマンス最適化

1. **検索結果キャッシュ**: React Queryで5分キャッシュ
2. **仮想スクロール**: 大量の検索結果に対応
3. **デバウンス**: 検索入力500ms遅延
4. **ページネーション**: 無限スクロール実装

## 今後の拡張

1. **高度な検索フィルター**
   - ファイルタイプ
   - 日付範囲
   - ディレクトリ指定

2. **検索履歴**
   - 過去の検索クエリ保存
   - よく使う検索の保存

3. **AIアシスタント統合**
   - エディタ内容に基づく自動検索
   - コンテキスト提案

4. **マルチリポジトリ検索**
   - 複数リポジトリを横断検索

## 参考資料

- reference_v1/components/AIChat.tsx
- test-rag/page.tsx
- docs/04_VPS_RAG_IMPLEMENTATION.md
- docs/08_VPS_RAG_TESTING_GUIDE.md
