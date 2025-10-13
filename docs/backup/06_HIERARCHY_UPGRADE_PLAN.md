# 階層ファイル対応アップグレードプラン

## 🎯 目標

現在のVPS RAGシステムを階層構造のMarkdownファイルに対応させ、`wasborn14/test-editor`の全ファイルを読み取り可能にする。

## 📋 現在の制限

```python
# 現在の実装（ルートディレクトリのみ）
contents = repo.get_contents("")  # ルートの.mdファイルのみ
```

## 🚀 実装プラン

### Phase 1: GitHub API拡張（30分）

#### 1.1 再帰的ファイル探索機能

**ファイル**: `api/services/github_service.py`

```python
def get_all_markdown_files(self, repo_name: str, path: str = "") -> List[Dict]:
    """
    リポジトリから全ての.mdファイルを再帰的に取得
    """
    try:
        print(f"Exploring path: {path or 'root'}")
        repo = self.github.get_repo(repo_name)
        contents = repo.get_contents(path)
        markdown_files = []

        for content in contents:
            if content.type == "dir":
                # サブディレクトリを再帰的に探索
                print(f"Entering directory: {content.path}")
                sub_files = self.get_all_markdown_files(repo_name, content.path)
                markdown_files.extend(sub_files)

            elif content.name.endswith('.md'):
                # Markdownファイルを追加
                file_content = base64.b64decode(content.content).decode('utf-8')
                print(f"Found: {content.path}")

                markdown_files.append({
                    'path': content.path,
                    'name': content.name,
                    'content': file_content,
                    'sha': content.sha,
                    'directory': os.path.dirname(content.path),
                    'depth': content.path.count('/')
                })

        return markdown_files

    except Exception as e:
        print(f"Error exploring {path}: {e}")
        return []
```

#### 1.2 既存メソッドの更新

```python
def get_markdown_files(self, repo_name: str, limit: int = 50) -> List[Dict]:
    """
    全階層から.mdファイルを取得（制限付き）
    """
    all_files = self.get_all_markdown_files(repo_name)

    # 制限適用
    limited_files = all_files[:limit]

    print(f"Total files found: {len(all_files)}, returning: {len(limited_files)}")
    return limited_files
```

### Phase 2: ChromaDB拡張（20分）

#### 2.1 メタデータ拡張

**ファイル**: `api/services/chroma_service.py`

```python
def add_documents(self, repo_name: str, documents: List[Dict]):
    """
    階層情報を含むメタデータでドキュメントを追加
    """
    collection = self.get_or_create_collection(repo_name)

    if not documents:
        return

    texts = []
    metadatas = []
    ids = []

    for doc in documents:
        # チャンク分割
        chunks = self.split_into_chunks(doc['content'], 500)

        for i, chunk in enumerate(chunks):
            texts.append(chunk)
            metadatas.append({
                'path': doc['path'],
                'name': doc['name'],
                'sha': doc['sha'],
                'directory': doc.get('directory', ''),
                'depth': doc.get('depth', 0),
                'chunk_index': i,
                'total_chunks': len(chunks),
                'file_type': 'markdown'
            })
            ids.append(f"{doc['sha']}_{i}")

    # バッチ追加
    collection.add(
        documents=texts,
        metadatas=metadatas,
        ids=ids
    )

    print(f"Added {len(texts)} chunks from {len(documents)} files")
```

#### 2.2 階層検索機能

```python
def search_by_directory(self, repo_name: str, directory: str, query: str, n_results: int = 5):
    """
    特定ディレクトリ内での検索
    """
    collection = self.get_or_create_collection(repo_name)

    # 全検索結果を取得
    results = collection.query(
        query_texts=[query],
        n_results=n_results * 3,  # 多めに取得してフィルタ
        where={"directory": {"$eq": directory}}  # ディレクトリフィルタ
    )

    # 結果整形
    filtered_results = []
    for doc, meta, distance in zip(
        results['documents'][0][:n_results],
        results['metadatas'][0][:n_results],
        results['distances'][0][:n_results]
    ):
        filtered_results.append({
            'content': doc,
            'metadata': meta,
            'score': 1 - (distance / 2)
        })

    return filtered_results
```

### Phase 3: API拡張（15分）

#### 3.1 新しいエンドポイント追加

**ファイル**: `api/main.py`

```python
class DirectorySearchRequest(BaseModel):
    query: str
    repository: str
    directory: str = ""  # 空文字列は全体検索
    limit: Optional[int] = 5

@app.post("/api/search/directory")
async def search_directory(
    request: DirectorySearchRequest,
    token: str = Depends(verify_token)
):
    """
    特定ディレクトリ内でのセマンティック検索
    """
    if request.directory:
        results = chroma_service.search_by_directory(
            repo_name=request.repository,
            directory=request.directory,
            query=request.query,
            n_results=request.limit
        )
    else:
        # 通常の全体検索
        results = chroma_service.search(
            repo_name=request.repository,
            query=request.query,
            n_results=request.limit
        )

    return SearchResponse(
        results=results,
        total=len(results)
    )

@app.get("/api/repository/{repo_name}/structure")
async def get_repository_structure(
    repo_name: str,
    token: str = Depends(verify_token)
):
    """
    リポジトリの階層構造を取得
    """
    try:
        files = github_service.get_all_markdown_files(repo_name)

        # ディレクトリ構造を整理
        structure = {}
        for file in files:
            parts = file['path'].split('/')
            current = structure

            for part in parts[:-1]:  # ファイル名以外
                if part not in current:
                    current[part] = {}
                current = current[part]

            # ファイル情報を追加
            current[parts[-1]] = {
                'type': 'file',
                'path': file['path'],
                'name': file['name']
            }

        return {
            "repository": repo_name,
            "structure": structure,
            "total_files": len(files)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Phase 4: テスト設定更新（10分）

#### 4.1 test.httpファイル更新

```http
### 階層検索テスト
POST {{baseUrl}}/api/search/directory
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "query": "API認証",
  "repository": "{{repo}}",
  "directory": "docs/api",
  "limit": 3
}

### リポジトリ構造確認
GET {{baseUrl}}/api/repository/{{repo}}/structure
Authorization: Bearer {{token}}

### 深い階層での検索
POST {{baseUrl}}/api/search/directory
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "query": "AWS デプロイ",
  "repository": "{{repo}}",
  "directory": "tutorials/deployment/cloud",
  "limit": 5
}
```

## 📊 期待される改善効果

### Before (現在)
```bash
# ルートディレクトリのみ
README.md (1ファイル)
```

### After (改善後)
```bash
# 全階層対応
README.md
docs/getting-started.md
docs/api/authentication.md
tutorials/deployment/cloud/aws.md
...
(15+ファイル)
```

## 🧪 テスト計画

### 1. 基本階層テスト
```bash
# 1. 全ファイル同期
curl -X POST http://localhost:8001/api/sync \
  -H "Authorization: Bearer test123" \
  -d '{"repository": "wasborn14/test-editor"}'

# 期待結果: 15+ファイルが同期される
```

### 2. 階層検索テスト
```bash
# docs/api ディレクトリ内検索
curl -X POST http://localhost:8001/api/search/directory \
  -H "Authorization: Bearer test123" \
  -d '{
    "query": "認証",
    "repository": "wasborn14/test-editor",
    "directory": "docs/api"
  }'

# 期待結果: authentication.md が最上位に表示
```

### 3. セマンティック検索テスト
```bash
# 「デプロイ方法」で検索
curl -X POST http://localhost:8001/api/search \
  -H "Authorization: Bearer test123" \
  -d '{
    "query": "デプロイ方法",
    "repository": "wasborn14/test-editor"
  }'

# 期待結果: tutorials/deployment/*.md が上位に表示
```

## ⚡ 実装順序

1. **GitHub Service拡張**: 再帰的ファイル探索
2. **ChromaDB Service拡張**: メタデータ強化
3. **API拡張**: 新エンドポイント追加
4. **テスト**: 階層ファイルでの動作確認

## 📈 パフォーマンス考慮

- **ファイル数制限**: 初期設定50ファイル
- **再帰深度制限**: 最大5階層
- **キャッシュ機能**: 後のPhaseで追加
- **並列処理**: 大量ファイル対応時に実装

## 🔧 設定オプション

```python
# 設定可能な制限
MAX_FILES = 100          # 最大ファイル数
MAX_DEPTH = 5           # 最大階層深度
MAX_FILE_SIZE = 50000   # 最大ファイルサイズ（文字）
CHUNK_SIZE = 500        # チャンクサイズ
```

この実装により、`wasborn14/test-editor`の全階層ファイルを読み取り、高精度なセマンティック検索が可能になります。