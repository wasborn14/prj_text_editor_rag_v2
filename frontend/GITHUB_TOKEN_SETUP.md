# GitHub Personal Access Token セットアップ

## 問題

SupabaseのGitHub OAuth認証では`provider_token`が保存されないため、GitHub APIを呼び出せません。

## 解決策

GitHub Personal Access Token (classic)を生成して使用します。

### 手順

1. https://github.com/settings/tokens にアクセス
2. **"Generate new token (classic)"** をクリック
3. 以下を設定:
   - **Note**: `RAG Editor Development`
   - **Expiration**: `90 days`（または`No expiration`）
   - **Select scopes**:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `read:user` (Read user profile data)
     - ✅ `user:email` (Access user email addresses)
4. **"Generate token"** をクリック
5. トークンをコピー（`ghp_...`で始まる）

### トークンを環境変数に設定

`.env.local`に追加:

```bash
# GitHub Personal Access Token (classic)
NEXT_PUBLIC_GITHUB_PERSONAL_TOKEN=ghp_your_token_here
```

### コードで使用

トークンは認証後に自動的に使用されます。

## 注意事項

- Personal Access Tokenは**自分のアカウント専用**です
- 他のユーザーがログインした場合、そのユーザーのトークンが必要です
- 本番環境では各ユーザーがOAuth認証でトークンを取得する仕組みが必要です
