# GitHub認証セットアップガイド

## 1. GitHub OAuth Appの作成

1. https://github.com/settings/developers にアクセス
2. "OAuth Apps" → "New OAuth App" をクリック
3. 以下の情報を入力:
   - **Application name**: RAG Editor (任意の名前)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. "Register application" をクリック
5. Client ID をコピー
6. "Generate a new client secret" をクリックして、Client Secret をコピー

## 2. 環境変数の設定

`.env.local` ファイルを編集して、取得した認証情報を設定:

```bash
# GitHub OAuth App credentials
GITHUB_ID=your_github_client_id_here
GITHUB_SECRET=your_github_client_secret_here

# NextAuth configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
```

`NEXTAUTH_SECRET` は以下のコマンドで生成:
```bash
openssl rand -base64 32
```

## 3. アプリケーションの起動

```bash
npm run dev
```

http://localhost:3000 にアクセスすると、自動的にログインページ (`/login`) にリダイレクトされます。

## 4. 機能テスト

### ログインフロー
1. `/login` で「GitHubでログイン」ボタンをクリック
2. GitHubの認証画面で許可
3. `/dashboard` にリダイレクトされ、リポジトリ一覧が表示される

### トークンリフレッシュの検証
この実装では以下の仕組みでトークンリフレッシュを検証できます:

- **トークン有効期限**: GitHubのアクセストークンは通常8時間有効
- **リフレッシュロジック**: [src/lib/auth.ts](src/lib/auth.ts) の `jwt` コールバックで実装
- **エラー表示**: トークンリフレッシュに失敗すると、ダッシュボードに赤いアラートが表示される

### 検証方法
1. ログイン後、`/dashboard` でリポジトリ一覧を確認
2. 1時間以上経過後、ページをリロード
3. トークンリフレッシュが成功すれば、引き続きリポジトリが表示される
4. 失敗した場合、赤いアラート「トークンの更新に失敗しました」が表示される

## 5. 実装されたファイル

### 認証関連
- [src/lib/auth.ts](src/lib/auth.ts) - NextAuth設定とトークンリフレッシュロジック
- [src/types/next-auth.d.ts](src/types/next-auth.d.ts) - NextAuthの型定義拡張
- [src/app/api/auth/[...nextauth]/route.ts](src/app/api/auth/[...nextauth]/route.ts) - NextAuth APIルート
- [src/middleware.ts](src/middleware.ts) - 認証ミドルウェア

### ページ
- [src/app/page.tsx](src/app/page.tsx) - ルートページ（ログインページへリダイレクト）
- [src/app/login/page.tsx](src/app/login/page.tsx) - ログインページ
- [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) - ダッシュボード（リポジトリ一覧）

### GitHub API
- [src/lib/github.ts](src/lib/github.ts) - GitHub API クライアント（Octokit）

## トークンリフレッシュの仕組み

### 実装内容 ([src/lib/auth.ts](src/lib/auth.ts))
```typescript
async jwt({ token, account, profile }) {
  // トークン有効期限をチェック
  if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
    return token // まだ有効
  }

  // 期限切れの場合、リフレッシュを試みる
  return await refreshAccessToken(token)
}
```

### 注意点
GitHubのOAuthアプリは**リフレッシュトークンをデフォルトでサポートしていません**。

リフレッシュトークンを有効にするには:
1. GitHub OAuth Appの設定で "Refresh token rotation" を有効化する必要がある
2. または、GitHub Appを使用する（より高度な権限管理が可能）

### デバッグ
トークンリフレッシュの動作確認は、サーバーログで確認できます:
```bash
npm run dev
# ログに以下が表示される:
# - "Token expired, attempting refresh..."
# - "Token refreshed successfully" または
# - "Error refreshing access token: ..."
```

## 次のステップ

リフレッシュトークンの問題が解決したら、以下の機能を追加できます:
- リポジトリ内のファイル一覧表示
- ファイルの編集機能
- RAGシステムとの統合
