# 28_REPOSITORY_SELECTION_IMPLEMENTATION_PLAN.md

リポジトリ選択機能の実装計画書

## 概要

ユーザーがメインで使用するリポジトリを一度選択し、以降は固定で使用する機能の実装計画。初回ログイン時のリポジトリ選択から、通常使用時の自動適用、設定変更まで包括的にカバーする。

## 設計思想

### 基本方針
- **「一度選択したら忘れて使える」** を最優先
- 初回選択の重要性を強調
- 変更は設定画面から明示的に実行
- シンプルで直感的なUX

### ユーザーの利用想定
- GitHubリポジトリがメイン作業対象
- リポジトリ変更頻度: 年に数回程度
- 変更理由: プロジェクト終了、リポジトリ作り直し等

## ログイン時の分岐制御

### 認証フロー詳細

```mermaid
graph TD
    A[ログイン成功] --> B{認証状態確認}
    B -->|未認証| C[/ ページに戻る]
    B -->|認証済み| D{selectedRepository確認}

    D -->|null| E[/repository-setup へリダイレクト]
    D -->|存在| F{リポジトリ有効性確認}

    F -->|有効| G[/dashboard へ進む]
    F -->|無効/削除済み| H[selectedRepository を null にリセット]
    H --> E

    E --> I[リポジトリ選択画面表示]
    I --> J[リポジトリ選択 & 保存]
    J --> K[Zustand state 更新]
    K --> L[/dashboard へリダイレクト]
```

### 実装レベルでの分岐制御

#### 1. AuthStoreでの状態管理
```typescript
interface AuthState {
  // 既存の状態
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  githubToken: string | null

  // 新規追加
  selectedRepository: UserRepository | null
  repositorySetupCompleted: boolean

  // 新規アクション
  setSelectedRepository: (repo: UserRepository | null) => void
  setRepositorySetupCompleted: (completed: boolean) => void
  validateSelectedRepository: () => Promise<boolean>
}
```

#### 2. 認証完了後の処理フロー
```typescript
// authStore.ts の initialize 関数内
initialize: async () => {
  // 既存の認証処理...
  const { data: { session } } = await supabase.auth.getSession()
  set({ session, user: session?.user ?? null, loading: false })

  if (session?.user) {
    await ensureProfile(session.user)

    // 新規追加: リポジトリ選択状態確認
    await checkRepositorySelection()
  }
},

checkRepositorySelection: async () => {
  const { user } = get()
  if (!user) return

  try {
    // 1. 既存の選択済みリポジトリ確認
    const response = await fetch('/api/repositories/selected')

    if (response.ok) {
      const { data } = await response.json()
      if (data?.selected_repository) {
        // 2. リポジトリの有効性確認
        const isValid = await validateRepository(data.selected_repository.id)

        if (isValid) {
          set({
            selectedRepository: data.selected_repository,
            repositorySetupCompleted: true
          })
        } else {
          // 無効な場合はリセット
          await resetRepositorySelection()
        }
      } else {
        // 選択済みリポジトリなし
        set({ repositorySetupCompleted: false })
      }
    } else {
      set({ repositorySetupCompleted: false })
    }
  } catch (error) {
    console.error('Repository selection check failed:', error)
    set({ repositorySetupCompleted: false })
  }
}
```

#### 3. ページレベルでの分岐制御

**3.1 useRequireRepositorySelection フック**
```typescript
// /src/hooks/useRequireRepositorySelection.ts
export function useRequireRepositorySelection() {
  const selectedRepository = useAuthStore(state => state.selectedRepository)
  const repositorySetupCompleted = useAuthStore(state => state.repositorySetupCompleted)
  const loading = useAuthStore(state => state.loading)
  const user = useAuthStore(state => state.user)
  const router = useRouter()

  useLayoutEffect(() => {
    // ローディング中は何もしない
    if (loading) return

    // 未認証の場合は認証系フックに任せる
    if (!user) return

    // リポジトリ選択が完了していない場合
    if (!repositorySetupCompleted || !selectedRepository) {
      router.replace('/repository-setup')
      return
    }

    // その他の検証...
  }, [selectedRepository, repositorySetupCompleted, loading, user, router])

  return {
    selectedRepository,
    repositorySetupCompleted,
    loading: loading || !repositorySetupCompleted
  }
}
```

**3.2 Dashboard ページでの適用**
```typescript
// /src/app/dashboard/page.tsx
export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useRequireAuth()
  const {
    selectedRepository,
    repositorySetupCompleted,
    loading: repoLoading
  } = useRequireRepositorySelection()

  const loading = authLoading || repoLoading

  if (loading) {
    return <LoadingScreen />
  }

  if (!user || !selectedRepository) {
    return null // リダイレクト処理はフック内で実行
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <main>
        {/* selectedRepository を使用した内容 */}
        <RepositoryWorkspace repository={selectedRepository} />
      </main>
    </div>
  )
}
```

#### 4. 条件分岐のエッジケース処理

**4.1 リポジトリ削除・アクセス権限剥奪**
```typescript
validateRepository: async (repositoryId: number) => {
  try {
    const response = await fetch(`/api/repositories/${repositoryId}/validate`)
    return response.ok
  } catch {
    return false
  }
}
```

**4.2 同時ログインでの競合状態**
```typescript
// 複数タブでの同時アクセス対応
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'selected-repository-changed') {
      // 他のタブでリポジトリが変更された場合の処理
      window.location.reload()
    }
  }

  window.addEventListener('storage', handleStorageChange)
  return () => window.removeEventListener('storage', handleStorageChange)
}, [])
```

## API設計

### 新規APIエンドポイント

#### 1. GET /api/repositories/selected
```typescript
// 現在選択されているリポジトリを取得
export async function GET() {
  const { user } = await getAuthenticatedUser()

  const { data } = await supabase
    .from('user_repositories')
    .select(`
      *,
      repository:repositories(*)
    `)
    .eq('user_id', user.id)
    .eq('is_selected', true)
    .single()

  return NextResponse.json({
    data: {
      selected_repository: data
    }
  })
}
```

#### 2. POST /api/repositories/select
```typescript
// リポジトリを選択状態に設定
interface SelectRepositoryRequest {
  repository_id: number
}

export async function POST(request: NextRequest) {
  const { repository_id } = await request.json()
  const { user } = await getAuthenticatedUser()

  // トランザクション処理
  await supabase.rpc('select_user_repository', {
    p_user_id: user.id,
    p_repository_id: repository_id
  })

  return NextResponse.json({ success: true })
}
```

#### 3. GET /api/repositories/:id/validate
```typescript
// リポジトリの有効性確認
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user } = await getAuthenticatedUser()
  const repositoryId = parseInt(params.id)

  // ユーザーがアクセス可能かチェック
  const { data } = await supabase
    .from('user_repositories')
    .select('*')
    .eq('user_id', user.id)
    .eq('repository_id', repositoryId)
    .single()

  if (!data) {
    return NextResponse.json({ valid: false }, { status: 404 })
  }

  // GitHubでの存在確認（オプション）
  try {
    const github = new GitHubClient(session.provider_token)
    await github.getRepository(data.owner, data.name)
    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
```

## UI/UXデザイン

### Repository Setup ページ (/repository-setup)

#### レイアウト構成
```typescript
// /src/app/repository-setup/page.tsx
export default function RepositorySetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <Icon className="w-16 h-16 mx-auto text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Choose Your Main Repository
            </h1>
            <p className="text-lg text-gray-600">
              Select the repository you want to work with most frequently.
              You can change this later in Settings.
            </p>
          </div>

          {/* リポジトリリスト */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <RepositorySelectionList />
          </div>

          {/* フッター */}
          <div className="text-center mt-8 text-sm text-gray-500">
            Need to add a new repository?
            <button className="text-blue-600 hover:underline ml-1">
              Browse GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

#### コンポーネント設計
```typescript
interface RepositorySelectionListProps {
  onSelect?: (repository: UserRepository) => void
}

const RepositorySelectionList: React.FC<RepositorySelectionListProps> = ({
  onSelect
}) => {
  const [repositories, setRepositories] = useState<UserRepository[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSelect = async (repository: UserRepository) => {
    setLoading(true)
    try {
      await selectRepository(repository.id)
      onSelect?.(repository)
      router.push('/dashboard')
    } catch (error) {
      // エラーハンドリング
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {repositories.map(repo => (
        <RepositoryCard
          key={repo.id}
          repository={repo}
          selected={selectedId === repo.id}
          onSelect={() => handleSelect(repo)}
          disabled={loading}
        />
      ))}
    </div>
  )
}
```

### Settings ページでの変更機能

#### リポジトリ設定セクション
```typescript
// /src/app/settings/repository/page.tsx
export default function RepositorySettingsPage() {
  const selectedRepository = useAuthStore(state => state.selectedRepository)

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Repository Settings</h2>

        {/* 現在の選択 */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Repository
          </label>
          <div className="flex items-center space-x-3 p-4 border rounded-lg">
            <RepositoryIcon />
            <div>
              <div className="font-medium">{selectedRepository?.full_name}</div>
              <div className="text-sm text-gray-500">
                {selectedRepository?.description}
              </div>
            </div>
          </div>
        </div>

        {/* 変更ボタン */}
        <div className="space-y-4">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={() => setShowChangeModal(true)}
          >
            Change Repository
          </button>

          <div className="text-sm text-gray-500">
            ⚠️ Changing repository will reset your current session
          </div>
        </div>
      </div>
    </div>
  )
}
```

## データベース設計

### 既存テーブルの拡張

#### user_repositories テーブル
```sql
-- is_selected カラムの追加
ALTER TABLE user_repositories
ADD COLUMN is_selected BOOLEAN DEFAULT FALSE;

-- 一意制約: ユーザーあたり一つのリポジトリのみ選択可能
CREATE UNIQUE INDEX idx_user_repositories_selected
ON user_repositories (user_id)
WHERE is_selected = TRUE;
```

#### Supabase RPC関数
```sql
-- リポジトリ選択の原子的更新
CREATE OR REPLACE FUNCTION select_user_repository(
  p_user_id UUID,
  p_repository_id INTEGER
)
RETURNS VOID AS $$
BEGIN
  -- 既存の選択をクリア
  UPDATE user_repositories
  SET is_selected = FALSE
  WHERE user_id = p_user_id;

  -- 新しい選択を設定
  UPDATE user_repositories
  SET is_selected = TRUE, last_accessed_at = NOW()
  WHERE user_id = p_user_id AND repository_id = p_repository_id;

  -- 選択されたレコードが存在しない場合はエラー
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Repository not found for user';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## エラーハンドリング

### 考慮すべきエラーケース

1. **リポジトリアクセス権限剥奪**
   - GitHub側でのアクセス権限変更
   - リポジトリの削除

2. **ネットワークエラー**
   - API呼び出し失敗
   - 接続タイムアウト

3. **データ整合性エラー**
   - 複数リポジトリが選択状態
   - 存在しないリポジトリが選択状態

### エラー回復戦略
```typescript
const handleRepositoryError = async (error: Error) => {
  console.error('Repository error:', error)

  // 選択状態をリセット
  useAuthStore.getState().setSelectedRepository(null)
  useAuthStore.getState().setRepositorySetupCompleted(false)

  // セットアップページにリダイレクト
  router.push('/repository-setup?error=repository_invalid')
}
```

## 実装フェーズ

### Phase 1: 基本機能
- [ ] AuthStoreにリポジトリ選択状態追加
- [ ] /repository-setup ページ作成
- [ ] 基本的な選択・保存機能
- [ ] ダッシュボードでの表示

### Phase 2: 分岐制御とバリデーション
- [ ] ログイン時の分岐制御実装
- [ ] リポジトリ有効性確認
- [ ] エラーハンドリング強化

### Phase 3: 設定変更とUX向上
- [ ] Settings画面での変更機能
- [ ] 変更時の確認ダイアログ
- [ ] ローディング状態の改善

### Phase 4: 最適化
- [ ] パフォーマンス最適化
- [ ] キャッシュ機能
- [ ] エラーログ収集

## テスト計画

### 単体テスト
- リポジトリ選択ロジック
- バリデーション関数
- API エンドポイント

### 統合テスト
- ログインフロー全体
- 認証→選択→ダッシュボード遷移
- エラー発生時の回復

### ユーザビリティテスト
- 初回ユーザーの選択体験
- 既存ユーザーの継続利用
- 設定変更の使いやすさ

---

**計画作成日**: 2025年9月23日
**関連ドキュメント**: 27_ZUSTAND_MIGRATION_AND_ENHANCEMENTS.md
**実装予定**: Phase 1から順次実装