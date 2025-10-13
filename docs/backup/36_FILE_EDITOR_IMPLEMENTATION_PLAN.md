# 36_FILE_EDITOR_IMPLEMENTATION_PLAN.md

## Overview

ワークスペースのエディタ部分に選択されたファイルの内容を表示する機能の実装プラン。GitHub APIから直接ファイル内容を取得し、Monaco Editorで表示・編集可能にする。

## 実装アーキテクチャ

### データフロー
```
ユーザーファイル選択 → GitHub Contents API → ファイル内容取得 → Monaco Editor表示
```

### 技術スタック
- **エディタ**: Monaco Editor (VS Code engine)
- **状態管理**: Zustand (グローバル状態)
- **API**: GitHub Contents API
- **キャッシュ**: TanStack Query

## Phase 1: 基本ファイル表示

### 1.1 状態管理ストア作成

```typescript
// stores/editorStore.ts
import { create } from 'zustand'

interface EditorFile {
  path: string
  content: string
  sha: string
  language: string
  size: number
  encoding: string
}

interface EditorState {
  // 現在選択中のファイル
  selectedFile: EditorFile | null

  // ロード状態
  isLoading: boolean
  error: string | null

  // アクション
  setSelectedFile: (file: EditorFile | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearEditor: () => void
}

export const useEditorStore = create<EditorState>((set) => ({
  selectedFile: null,
  isLoading: false,
  error: null,

  setSelectedFile: (file) => set({ selectedFile: file, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  clearEditor: () => set({
    selectedFile: null,
    isLoading: false,
    error: null
  })
}))
```

### 1.2 ファイル内容取得API

```typescript
// hooks/useFileContent.ts
import { useQuery } from '@tanstack/react-query'
import { useEditorStore } from '@/stores/editorStore'

interface FileContentResponse {
  content: string
  sha: string
  size: number
  encoding: string
  language: string
}

async function fetchFileContent(
  repositoryId: string,
  filePath: string
): Promise<FileContentResponse> {
  const response = await fetch(
    `/api/repositories/${repositoryId}/files/content?path=${encodeURIComponent(filePath)}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`)
  }

  return response.json()
}

export function useFileContent(repositoryId: string, filePath: string | null) {
  const { setSelectedFile, setLoading, setError } = useEditorStore()

  return useQuery({
    queryKey: ['file-content', repositoryId, filePath],
    queryFn: () => fetchFileContent(repositoryId, filePath!),
    enabled: !!repositoryId && !!filePath,
    staleTime: 30 * 1000, // 30秒キャッシュ
    onSuccess: (data) => {
      setSelectedFile({
        path: filePath!,
        content: data.content,
        sha: data.sha,
        language: data.language,
        size: data.size,
        encoding: data.encoding
      })
      setLoading(false)
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : 'Unknown error')
    },
    onLoading: () => {
      setLoading(true)
    }
  })
}
```

### 1.3 GitHub APIエンドポイント作成

```typescript
// app/api/repositories/[id]/files/content/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Octokit } from '@octokit/rest'

// プログラミング言語検出
function detectLanguage(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase()

  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'rb': 'ruby',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'swift': 'swift',
    'kt': 'kotlin',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'xml': 'xml',
    'yml': 'yaml',
    'yaml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'dockerfile': 'dockerfile'
  }

  return languageMap[extension || ''] || 'plaintext'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const repositoryId = resolvedParams.id

    // クエリパラメータからファイルパスを取得
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 })
    }

    // リポジトリ情報取得
    const { data: repository, error: repoError } = await supabase
      .from('user_repositories')
      .select('*')
      .eq('id', repositoryId)
      .eq('user_id', session.user.id)
      .single()

    if (repoError || !repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
    }

    // GitHub APIでファイル内容を取得
    const octokit = new Octokit({
      auth: session.provider_token
    })

    const [owner, repo] = repository.full_name.split('/')

    const { data: fileData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: repository.default_branch
    })

    // ファイルの場合（ディレクトリではない）
    if (Array.isArray(fileData) || fileData.type !== 'file') {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 })
    }

    // Base64デコード
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8')

    return NextResponse.json({
      content,
      sha: fileData.sha,
      size: fileData.size,
      encoding: fileData.encoding,
      language: detectLanguage(filePath),
      path: filePath
    })

  } catch (error) {
    console.error('File content fetch error:', error)

    if (error instanceof Error && error.message.includes('Not Found')) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to fetch file content' },
      { status: 500 }
    )
  }
}
```

## Phase 2: Monaco Editor統合

### 2.1 Monaco Editorコンポーネント

```typescript
// components/organisms/CodeEditor/CodeEditor.tsx
'use client'

import { useEffect, useRef } from 'react'
import { Editor } from '@monaco-editor/react'
import { useEditorStore } from '@/stores/editorStore'
import { FileTreeNode } from '@/components/molecules/FileTree/FileTree'

interface CodeEditorProps {
  className?: string
}

export function CodeEditor({ className = '' }: CodeEditorProps) {
  const { selectedFile, isLoading, error } = useEditorStore()
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor
  }

  const handleEditorChange = (value: string | undefined) => {
    // TODO: Phase 3で編集機能実装
    console.log('Editor content changed:', value?.length)
  }

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading file...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-red-500">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-sm font-medium mb-2">Failed to load file</p>
          <p className="text-xs">{error}</p>
        </div>
      </div>
    )
  }

  if (!selectedFile) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📝</div>
          <p className="text-lg font-medium mb-2">Select a file to edit</p>
          <p className="text-sm">Choose a file from the directory tree to start editing</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* ファイル情報ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <h3 className="font-medium text-gray-900">{selectedFile.path}</h3>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {selectedFile.language}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {(selectedFile.size / 1024).toFixed(1)} KB
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={selectedFile.language}
          value={selectedFile.content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            readOnly: false, // Phase 3で編集可能に
            renderWhitespace: 'selection',
            selectOnLineNumbers: true,
            roundedSelection: false,
            cursorStyle: 'line',
            renderLineHighlight: 'all',
            tabSize: 2,
            insertSpaces: true
          }}
        />
      </div>
    </div>
  )
}
```

### 2.2 ワークスペースページ更新

```typescript
// app/workspace/page.tsx の変更部分
import { CodeEditor } from '@/components/organisms/CodeEditor/CodeEditor'
import { useFileContent } from '@/hooks/useFileContent'
import { useEditorStore } from '@/stores/editorStore'

export default function WorkspacePage() {
  // 既存のコード...
  const { clearEditor } = useEditorStore()
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null)

  // ファイル内容取得
  const { } = useFileContent(
    selectedRepository?.id || '',
    selectedFilePath
  )

  const handleFileSelect = (node: FileTreeNode) => {
    if (node.type === 'file') {
      console.log('File selected:', node.path)
      setSelectedFilePath(node.path)
    } else {
      // ディレクトリの場合は展開/折りたたみ
      console.log('Directory selected:', node.path)
    }
  }

  // リポジトリ変更時にエディタをクリア
  useEffect(() => {
    clearEditor()
    setSelectedFilePath(null)
  }, [selectedRepository?.id, clearEditor])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} selectedRepository={selectedRepository} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-200px)]">
          {/* Left Half: Directory Structure */}
          <div className="bg-white rounded-lg shadow-md flex flex-col">
            {/* 既存のファイルツリー表示コード */}
          </div>

          {/* Right Half: Code Editor */}
          <div className="bg-white rounded-lg shadow-md flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Editor
              </h3>
            </div>
            <div className="flex-1">
              <CodeEditor />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
```

## Phase 3: 追加機能（将来実装）

### 3.1 ファイル編集機能
- リアルタイム編集
- 自動保存
- GitHub APIでの保存

### 3.2 エディタ機能強化
- 構文ハイライト
- コード補完
- エラー表示
- フォーマット機能

### 3.3 UI/UX改善
- タブ機能（複数ファイル）
- ファイル検索
- ホットキー対応

## 実装手順

### Step 1: 基盤作成
1. `stores/editorStore.ts` 作成
2. `hooks/useFileContent.ts` 作成
3. APIエンドポイント作成

### Step 2: UI統合
1. `CodeEditor` コンポーネント作成
2. ワークスペースページ更新
3. ファイル選択イベント連携

### Step 3: テスト・調整
1. 各種ファイル形式テスト
2. エラーハンドリング調整
3. パフォーマンス最適化

## 必要なパッケージ

```bash
npm install @monaco-editor/react monaco-editor
```

この実装により、ファイル選択→内容表示の基本機能が完成します。