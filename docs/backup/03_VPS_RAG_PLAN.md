# MCP RAG実装計画

## 概要

VSCode + MCPサーバーによるローカルRAG（検索拡張生成）システムの実装計画。Webアプリケーションを作らずに、普段のVSCode環境でマークダウンファイルに対するAI質問・検索機能を提供する。

## 目標

- **ローカル完結**: インターネット接続最小限（LLM APIのみ）
- **VSCode統合**: 普段の編集環境にシームレス統合
- **高速検索**: ワークスペース内ファイルのセマンティック検索
- **コンテキスト保持**: 関連ファイルを自動取得してAI回答生成
- **プライバシー重視**: ローカルでベクトル化・インデックス処理

## アーキテクチャ

### システム構成

```
VSCode
├── MCP Extension (UI)
│   ├── Chat Panel (サイドバー)
│   ├── Search Command (コマンドパレット)
│   └── Hover Provider (関連ファイル表示)
│
└── MCP Server (RAG Engine)
    ├── Vector Store (Chroma/Weaviate)
    ├── Embedding Service (OpenAI/Local)
    ├── LLM Service (OpenAI/Anthropic/Ollama)
    └── File Indexer (Markdown Parser)
```

### データフロー

```
1. ファイル変更検知 → 自動インデックス更新
2. ユーザー質問 → セマンティック検索 → 関連コンテンツ取得
3. コンテキスト + 質問 → LLM → 引用付き回答
4. 回答表示 + ファイルリンク → VSCodeで該当箇所を開く
```

## 技術スタック

### MCPサーバー
- **言語**: TypeScript/Python
- **Vector DB**: Chroma (ローカル) または Weaviate
- **Embeddings**:
  - クラウド: OpenAI text-embedding-3-small
  - ローカル: sentence-transformers (all-MiniLM-L6-v2)
- **LLM**: OpenAI GPT-4 / Anthropic Claude / Ollama (ローカル)

### VSCode Extension
- **言語**: TypeScript
- **UI**: WebView Panel + Tree View
- **通信**: MCP Protocol
- **コマンド**: Command Palette Integration

## 実装計画

### Phase 1: MCPサーバー基盤（3-4日）

#### 1.1 ベクトルストア統合
```typescript
// mcp-rag-server/src/vector-store.ts
export class VectorStore {
  private client: ChromaClient;

  async indexFile(filePath: string, content: string): Promise<void> {
    const chunks = this.chunkContent(content);
    const embeddings = await this.generateEmbeddings(chunks);
    await this.client.add({
      ids: [`${filePath}:${chunkIndex}`],
      embeddings,
      metadatas: [{ filePath, chunkIndex, content: chunk }]
    });
  }

  async search(query: string, limit: number = 5): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const results = await this.client.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit
    });
    return this.formatResults(results);
  }
}
```

#### 1.2 ファイルインデクサー
```typescript
// mcp-rag-server/src/indexer.ts
export class MarkdownIndexer {
  async indexWorkspace(workspacePath: string): Promise<void> {
    const markdownFiles = await this.findMarkdownFiles(workspacePath);

    for (const filePath of markdownFiles) {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = this.parseMarkdown(content);
      await this.vectorStore.indexFile(filePath, parsed);
    }
  }

  private chunkContent(content: string): string[] {
    // 見出しベースの chunk 分割
    // 500-800 token程度のchunkに分割
    return chunks;
  }
}
```

#### 1.3 RAGサービス
```typescript
// mcp-rag-server/src/rag-service.ts
export class RAGService {
  async query(question: string): Promise<RAGResponse> {
    // 1. セマンティック検索で関連コンテンツ取得
    const searchResults = await this.vectorStore.search(question, 5);

    // 2. コンテキスト構築
    const context = this.buildContext(searchResults);

    // 3. LLMに質問
    const prompt = this.buildPrompt(question, context);
    const answer = await this.llmService.generate(prompt);

    return {
      answer,
      sources: searchResults.map(r => ({
        filePath: r.metadata.filePath,
        content: r.metadata.content,
        score: r.score
      }))
    };
  }
}
```

### Phase 2: VSCode Extension（2-3日）

#### 2.1 MCPクライアント統合
```typescript
// extension/src/mcp-client.ts
export class MCPClient {
  private client: Client;

  async initialize(): Promise<void> {
    this.client = new Client({
      name: "vscode-rag-extension",
      version: "1.0.0"
    }, {
      command: "node",
      args: ["path/to/mcp-rag-server/dist/index.js"]
    });

    await this.client.connect();
  }

  async ragQuery(question: string): Promise<RAGResponse> {
    return await this.client.request({
      method: "rag/query",
      params: { question }
    });
  }
}
```

#### 2.2 チャットパネル
```typescript
// extension/src/chat-panel.ts
export class ChatPanel {
  private webview: vscode.WebviewPanel;

  constructor(private mcpClient: MCPClient) {
    this.webview = vscode.window.createWebviewPanel(
      'ragChat',
      'RAG Chat',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    this.setupMessageHandling();
  }

  private async handleMessage(message: any) {
    if (message.type === 'question') {
      const response = await this.mcpClient.ragQuery(message.text);
      this.sendToWebview({
        type: 'answer',
        content: response.answer,
        sources: response.sources
      });
    }
  }
}
```

#### 2.3 コマンド統合
```typescript
// extension/src/extension.ts
export function activate(context: vscode.ExtensionContext) {
  const mcpClient = new MCPClient();
  await mcpClient.initialize();

  // インデックス作成コマンド
  const indexCommand = vscode.commands.registerCommand(
    'markdown-rag.indexWorkspace',
    async () => {
      const workspacePath = vscode.workspace.rootPath;
      await mcpClient.indexWorkspace(workspacePath);
      vscode.window.showInformationMessage('Workspace indexed successfully');
    }
  );

  // 質問コマンド
  const queryCommand = vscode.commands.registerCommand(
    'markdown-rag.askQuestion',
    async () => {
      const question = await vscode.window.showInputBox({
        prompt: 'ワークスペースについて質問してください'
      });

      if (question) {
        const panel = new ChatPanel(mcpClient);
        panel.askQuestion(question);
      }
    }
  );

  context.subscriptions.push(indexCommand, queryCommand);
}
```

### Phase 3: 高度機能（2-3日）

#### 3.1 リアルタイムインデックス
```typescript
// ファイル変更の自動検知・インデックス更新
const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');

watcher.onDidChange(async (uri) => {
  const content = await vscode.workspace.fs.readFile(uri);
  await mcpClient.updateIndex(uri.fsPath, content.toString());
});
```

#### 3.2 ホバープロバイダー
```typescript
// カーソル位置のコンテキストで関連ファイル表示
export class RAGHoverProvider implements vscode.HoverProvider {
  async provideHover(document: vscode.TextDocument, position: vscode.Position) {
    const range = document.getWordRangeAtPosition(position);
    const word = document.getText(range);

    const relatedFiles = await this.mcpClient.findRelated(word);

    if (relatedFiles.length > 0) {
      const markdown = new vscode.MarkdownString();
      markdown.appendMarkdown('**関連ファイル:**\n\n');

      for (const file of relatedFiles) {
        markdown.appendMarkdown(`- [${file.name}](${file.path})\n`);
      }

      return new vscode.Hover(markdown);
    }
  }
}
```

## 配布・設定

### MCPサーバー設定
```json
// Claude Desktop config
{
  "mcpServers": {
    "markdown-rag": {
      "command": "node",
      "args": ["path/to/mcp-rag-server/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "your-api-key",
        "VECTOR_STORE_PATH": "~/.vscode/markdown-rag/vectors"
      }
    }
  }
}
```

### VSCode Extension設定
```json
// settings.json
{
  "markdown-rag.mcpServerPath": "path/to/mcp-rag-server/dist/index.js",
  "markdown-rag.embeddingProvider": "openai", // or "local"
  "markdown-rag.llmProvider": "openai", // or "anthropic" or "ollama"
  "markdown-rag.autoIndex": true,
  "markdown-rag.chunkSize": 800
}
```

## 使用フロー

### 初回セットアップ
1. VSCode Extension をインストール
2. `Cmd+Shift+P` → "RAG: Index Workspace"
3. ワークスペース内の`.md`ファイルがインデックス化

### 日常使用
1. **質問**: `Cmd+Shift+P` → "RAG: Ask Question"
2. **チャット**: サイドバーのRAGパネルで会話
3. **関連ファイル**: 単語にホバーで関連ファイル表示
4. **自動更新**: ファイル編集時に自動でインデックス更新

## パフォーマンス最適化

### インデックス最適化
- **差分更新**: 変更ファイルのみ再インデックス
- **バックグラウンド処理**: 大量ファイル処理時のUI阻害回避
- **キャッシュ**: よく使われるクエリの結果キャッシュ

### 検索高速化
- **ローカルベクトルDB**: Chromaのメモリ効率化
- **チャンク戦略**: 見出しベース + 文章境界での最適分割
- **並列処理**: 複数ファイルの並列埋め込み生成

## セキュリティ・プライバシー

### データの取り扱い
- **ローカル保存**: ベクトルデータはローカルディスクのみ
- **API使用**: 埋め込み・LLM生成時のみ外部API使用
- **データ削除**: ワークスペース削除時の関連データクリーンアップ

### 設定可能性
- **オフライン**: Ollama使用時は完全ローカル
- **選択的インデックス**: 特定フォルダ/ファイルのみ対象
- **データ暗号化**: ローカルベクトルストアの暗号化

## ロードマップ

### v1.0 (MVP)
- ✅ 基本RAG機能
- ✅ ワークスペースインデックス
- ✅ 質問応答
- ✅ ファイルリンク

### v1.1 (改善)
- ✅ リアルタイムインデックス
- ✅ ホバー機能
- ✅ 設定UI
- ✅ エラーハンドリング

### v1.2 (高度機能)
- ✅ 多言語対応
- ✅ カスタムチャンク戦略
- ✅ プラグイン機能
- ✅ チーム設定共有

## 期待効果

### 開発者体験向上
- **情報検索時間短縮**: 関連ドキュメントを瞬時に発見
- **文脈理解促進**: プロジェクト全体の知識をAIが把握
- **学習効率向上**: 過去の実装パターンをAIが提案

### プライバシー保護
- **企業機密保護**: ローカル処理でデータ漏洩リスク最小化
- **カスタマイズ自由度**: 社内ガイドライン準拠の設定可能

---

**2025/01/17作成**: Webアプリに代わるVSCode統合RAGシステムの包括的実装計画