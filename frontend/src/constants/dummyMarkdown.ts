export const DUMMY_MARKDOWN = `# コードブロックのテスト

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
