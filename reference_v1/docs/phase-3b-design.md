# Phase 3B: 双方向同期 - 詳細設計書

## 1. 概要

### 目的
GitHubリポジトリ（デフォルトブランチ）とWebエディタ間の双方向同期を実現し、外部での変更を自動的に検出・反映させる。

### 主要機能
1. **GitHub Webhooks** - デフォルトブランチの変更通知
2. **自動同期** - 外部変更の自動取り込み
3. **競合解決** - 同時編集の安全な処理
4. **同期状態管理** - リアルタイム同期状態の表示

### スコープ制限
- **対象ブランチ**: デフォルトブランチ（main/master）のみ
- **将来拡張**: Phase 5以降で複数ブランチ対応を検討

## 2. アーキテクチャ設計

### 2.1 データフロー（デフォルトブランチ限定）

```mermaid
graph TD
    A[GitHub Repository<br/>main/master] -->|Webhook Event| B[/api/webhooks/github]
    B -->|Check Branch| C{Default Branch?}
    C -->|No| D[Ignore Event]
    C -->|Yes| E[Verify Signature]
    E -->|Invalid| F[Reject 401]
    E -->|Valid| G[Process Push Event]
    G -->|Fetch Changes| H[GitHub API<br/>ref: default_branch]
    H -->|Compare SHA| I{Conflict?}
    I -->|No| J[Update Supabase]
    I -->|Yes| K[Mark Conflict]
    K -->|Notify| L[Realtime Broadcast]
    L -->|Update UI| M[ConflictResolver]
    J -->|Broadcast| L
```

### 2.2 コンポーネント構成（簡略化版）

```
/api/webhooks/
  └── github/
      └── route.ts          # Webhookエンドポイント（デフォルトブランチ限定）

/lib/
  ├── github-sync.ts        # 同期ロジック（デフォルトブランチ）
  ├── conflict-detector.ts  # 競合検出
  └── merge-strategies.ts   # マージ戦略

/components/
  ├── ConflictResolver.tsx  # 競合解決UI
  ├── SyncStatus.tsx        # 同期状態表示
  └── BranchIndicator.tsx   # 現在のブランチ表示（読み取り専用）

/hooks/
  └── useRealtimeSync.ts    # リアルタイム同期フック
```

## 3. 実装詳細

### 3.1 GitHub Webhooks設定

#### Webhook設定項目（簡略化）
```javascript
{
  payloadUrl: "https://[your-domain]/api/webhooks/github",
  contentType: "application/json",
  secret: process.env.GITHUB_WEBHOOK_SECRET,
  events: [
    "push"  // デフォルトブランチのpushのみ監視
  ]
}
```

#### ブランチフィルタリング
```typescript
// /api/webhooks/github/route.ts
export async function POST(request: Request) {
  const payload = await request.json();

  // デフォルトブランチ以外は無視
  const repository = await getRepository(payload.repository.id);
  const defaultBranch = repository.default_branch || 'main';

  if (payload.ref !== `refs/heads/${defaultBranch}`) {
    return NextResponse.json({
      message: 'Ignoring non-default branch'
    }, { status: 200 });
  }

  // 署名検証とメイン処理...
}
```

#### 署名検証
```typescript
import crypto from 'crypto';

function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

### 3.2 競合検出アルゴリズム

#### SHA比較による競合検出
```typescript
interface ConflictDetection {
  local_sha: string;      // Supabase内のSHA
  remote_sha: string;     // GitHubの最新SHA
  base_sha: string;       // 最後の同期時のSHA
}

enum ConflictType {
  NO_CONFLICT,           // 競合なし
  FAST_FORWARD,          // 単純な更新
  MERGE_REQUIRED,        // マージ必要
  CONFLICT               // 競合あり
}

function detectConflict(detection: ConflictDetection): ConflictType {
  if (detection.local_sha === detection.remote_sha) {
    return ConflictType.NO_CONFLICT;
  }
  if (detection.local_sha === detection.base_sha) {
    return ConflictType.FAST_FORWARD;
  }
  if (detection.remote_sha === detection.base_sha) {
    return ConflictType.MERGE_REQUIRED;
  }
  return ConflictType.CONFLICT;
}
```

### 3.3 3-way Merge戦略

#### マージ処理フロー
```typescript
interface MergeContext {
  base: string;     // 共通祖先
  local: string;    // ローカル変更
  remote: string;   // リモート変更
}

class ThreeWayMerge {
  async merge(context: MergeContext): Promise<MergeResult> {
    // 1. 行ごとの差分を計算
    const baseDiff = this.diffLines(context.base, context.local);
    const remoteDiff = this.diffLines(context.base, context.remote);

    // 2. 競合しない変更を自動マージ
    const autoMerged = this.autoMerge(baseDiff, remoteDiff);

    // 3. 競合箇所を特定
    const conflicts = this.findConflicts(baseDiff, remoteDiff);

    return {
      merged: autoMerged,
      conflicts: conflicts,
      requiresManualResolve: conflicts.length > 0
    };
  }
}
```

### 3.4 リアルタイム同期

#### Supabase Realtimeの活用
```typescript
// hooks/useRealtimeSync.ts
export function useRealtimeSync(repositoryId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`repo:${repositoryId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'files',
        filter: `repository_id=eq.${repositoryId}`
      }, (payload) => {
        handleFileUpdate(payload);
      })
      .on('broadcast', {
        event: 'conflict_detected'
      }, (payload) => {
        handleConflict(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [repositoryId]);
}
```

## 4. データベース拡張（デフォルトブランチ版）

### 4.1 新規テーブル

```sql
-- 同期状態管理（ブランチ非依存）
CREATE TABLE sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID REFERENCES repositories(id),
  file_id UUID REFERENCES files(id),
  local_sha TEXT,          -- Supabase内のSHA
  remote_sha TEXT,         -- GitHub（デフォルトブランチ）のSHA
  base_sha TEXT,           -- 最後の同期時のSHA
  sync_state TEXT CHECK(sync_state IN ('synced', 'pending', 'conflict')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 競合情報
CREATE TABLE conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id),
  base_content TEXT,
  local_content TEXT,
  remote_content TEXT,
  conflict_markers JSONB, -- 競合箇所の行番号など
  resolved BOOLEAN DEFAULT FALSE,
  resolved_content TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTE: branchesテーブルは作成しない（Phase 5以降で追加）
-- repositoriesテーブルのdefault_branchカラムを活用
```

### 4.2 インデックス追加

```sql
CREATE INDEX idx_sync_status_repo ON sync_status(repository_id);
CREATE INDEX idx_sync_status_state ON sync_status(sync_state);
CREATE INDEX idx_conflicts_unresolved ON conflicts(file_id) WHERE NOT resolved;
-- ブランチ関連のインデックスは不要
```

## 5. UI/UXデザイン

### 5.1 同期状態インジケーター

```typescript
// components/SyncStatus.tsx
interface SyncStatusProps {
  state: 'synced' | 'syncing' | 'conflict' | 'error';
  lastSync?: Date;
  pendingChanges?: number;
}

export function SyncStatus({ state, lastSync, pendingChanges }: SyncStatusProps) {
  const statusConfig = {
    synced: { icon: '✅', color: 'green', text: 'Synced' },
    syncing: { icon: '🔄', color: 'blue', text: 'Syncing...' },
    conflict: { icon: '⚠️', color: 'yellow', text: 'Conflict' },
    error: { icon: '❌', color: 'red', text: 'Sync Error' }
  };
}
```

### 5.2 競合解決UI

```typescript
// components/ConflictResolver.tsx
interface ConflictResolverProps {
  base: string;
  local: string;
  remote: string;
  onResolve: (resolved: string) => void;
}

// 3カラム表示
// [Local Changes] | [Base/Original] | [Remote Changes]
//
// 各競合箇所で選択可能:
// - Accept Local (ローカルを採用)
// - Accept Remote (リモートを採用)
// - Accept Both (両方を保持)
// - Manual Edit (手動編集)
```

### 5.3 ブランチ表示UI（読み取り専用）

```typescript
// components/BranchIndicator.tsx
interface BranchIndicatorProps {
  repositoryName: string;
  branchName: string;  // 'main' or 'master'
}

export function BranchIndicator({ repositoryName, branchName }: BranchIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span>{repositoryName}</span>
      <span>/</span>
      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
        {branchName}
      </span>
      <span className="text-xs text-gray-500">(default)</span>
    </div>
  );
}

// 将来的な拡張性を考慮
// Phase 5でブランチ切り替え機能を追加する際に
// このコンポーネントを拡張
```

## 6. エラーハンドリング

### 6.1 同期エラーの種類

1. **ネットワークエラー** - 再試行ロジック
2. **認証エラー** - トークン更新
3. **レート制限** - バックオフ戦略
4. **競合エラー** - ユーザー介入要求

### 6.2 リトライ戦略

```typescript
class SyncRetryStrategy {
  private maxRetries = 3;
  private baseDelay = 1000;

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onError?: (error: Error, attempt: number) => void
  ): Promise<T> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === this.maxRetries) throw error;

        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        onError?.(error as Error, attempt);
      }
    }
    throw new Error('Max retries exceeded');
  }
}
```

## 7. セキュリティ考慮事項

### 7.1 Webhook検証

- HMAC署名による検証必須
- IPホワイトリスト（GitHub Meta API）
- レート制限実装
- ペイロードサイズ制限

### 7.2 データ保護

- SHAハッシュによる整合性確認
- トランザクション処理での同期
- 楽観的ロックによる競合防止

## 8. パフォーマンス最適化

### 8.1 差分同期（デフォルトブランチ限定）

```typescript
// 変更されたファイルのみ同期
async function syncChangedFiles(webhookPayload: PushEvent) {
  // デフォルトブランチの変更のみ処理
  const repository = await getRepository(webhookPayload.repository.id);
  const defaultBranch = repository.default_branch || 'main';

  const changedFiles = webhookPayload.commits
    .flatMap(commit => [
      ...commit.added,
      ...commit.modified,
      ...commit.removed
    ])
    .filter((file, index, self) => self.indexOf(file) === index);

  // バッチ処理で効率化
  const batchSize = 10;
  for (let i = 0; i < changedFiles.length; i += batchSize) {
    const batch = changedFiles.slice(i, i + batchSize);
    await Promise.all(batch.map(file =>
      syncFile(file, defaultBranch)
    ));
  }
}
```

### 8.2 キャッシュ戦略

- Redis/メモリキャッシュでSHA比較高速化
- ファイル内容の一時キャッシュ
- GitHub API応答のキャッシュ

## 9. テスト計画

### 9.1 単体テスト

- 署名検証ロジック
- 競合検出アルゴリズム
- マージ戦略

### 9.2 統合テスト

- Webhook受信→同期完了フロー
- 競合発生→解決フロー
- ブランチ切り替えフロー

### 9.3 E2Eテスト

- 同時編集シナリオ
- ネットワーク障害回復
- 大量ファイル同期

## 10. 実装優先順位

### Phase 1 (必須)
1. Webhookエンドポイント基本実装
2. 署名検証
3. Pushイベント処理
4. 単純な同期（競合なし）

### Phase 2 (重要)
1. 競合検出
2. 基本的な競合解決UI
3. 同期状態表示

### Phase 3 (拡張)
1. ブランチ切り替え
2. 高度なマージ戦略
3. リアルタイム通知

## 11. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| GitHub API制限 | 高 | キャッシュ、バッチ処理 |
| 大規模競合 | 中 | 段階的解決UI |
| 同期遅延 | 中 | 非同期処理、進捗表示 |
| データ不整合 | 高 | トランザクション、検証強化 |

---

*作成日: 2025-01-16*
*Phase 3B 設計書 v1.0*