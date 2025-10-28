export const DUMMY_MARKDOWN = `# Markdownエディタ テスト

## 表のテスト

### シンプルな表

| 名前 | 年齢 | 職業 |
|------|------|------|
| 太郎 | 25 | エンジニア |
| 花子 | 30 | デザイナー |
| 次郎 | 28 | プロダクトマネージャー |

### 複雑な表

| ID | プロジェクト名 | ステータス | 担当者 | 期限 |
|----|--------------|----------|--------|------|
| 1 | WebアプリA | 進行中 | 田中 | 2024-12-31 |
| 2 | モバイルアプリB | 完了 | 佐藤 | 2024-11-30 |
| 3 | API開発C | 計画中 | 鈴木 | 2025-01-15 |
| 4 | インフラ構築D | 進行中 | 高橋 | 2024-12-15 |

## TypeScriptコード

\`\`\`typescript
interface Repository {
  id: number
  name: string
  full_name: string
}

function getRepository(id: number): Repository {
  return {
    id,
    name: "test-repo",
    full_name: "user/test-repo"
  }
}
\`\`\`

## JavaScriptコード

\`\`\`javascript
const users = [
  { name: "Alice", age: 25 },
  { name: "Bob", age: 30 }
]

users.forEach(user => {
  console.log(\`\${user.name} is \${user.age} years old\`)
})
\`\`\`

## その他の要素

- 箇条書き1
- 箇条書き2
  - ネストされた項目
  - もう一つ

1. 番号付きリスト
2. 二つ目

> これは引用です

**太字** と *斜体* のテキスト
`
