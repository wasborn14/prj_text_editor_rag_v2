"""ChromaDB サービス - 高精度版"""
import chromadb
from chromadb.utils import embedding_functions
from typing import List, Dict
import os
import hashlib

class ChromaService:
    def __init__(self):
        # ChromaDBクライアント初期化
        self.client = chromadb.PersistentClient(
            path="/data/chromadb"
        )

        # 高精度なEmbedding関数を設定
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key:
            # OpenAI Embedding（1536次元、多言語対応）
            self.embedding_function = embedding_functions.OpenAIEmbeddingFunction(
                api_key=openai_api_key,
                model_name="text-embedding-ada-002"
            )
            print("Using OpenAI Embedding (text-embedding-ada-002)")
        else:
            # フォールバック: 多言語対応モデル
            self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="sentence-transformers/distiluse-base-multilingual-cased"
            )
            print("Using Multilingual Sentence Transformer")

        # デバッグ用
        print(f"Embedding function: {type(self.embedding_function).__name__}")

    def get_or_create_collection(self, repo_name: str):
        """コレクション取得または作成"""
        # リポジトリ名をハッシュ化してコレクション名に
        collection_name = f"repo_{hashlib.md5(repo_name.encode()).hexdigest()[:8]}"

        try:
            return self.client.get_collection(
                name=collection_name,
                embedding_function=self.embedding_function
            )
        except:
            return self.client.create_collection(
                name=collection_name,
                embedding_function=self.embedding_function
            )

    def split_into_chunks(self, text: str, chunk_size: int = 500) -> List[str]:
        """テキストをチャンクに分割"""
        if not text:
            return []

        words = text.split()
        chunks = []
        current_chunk = []
        current_size = 0

        for word in words:
            word_len = len(word) + 1  # スペース分を含む

            if current_size + word_len > chunk_size and current_chunk:
                # 現在のチャンクを保存
                chunks.append(' '.join(current_chunk))
                current_chunk = [word]
                current_size = word_len
            else:
                current_chunk.append(word)
                current_size += word_len

        # 最後のチャンクを追加
        if current_chunk:
            chunks.append(' '.join(current_chunk))

        return chunks if chunks else [text]  # 空の場合は元のテキストを返す

    def add_documents(self, repo_name: str, documents: List[Dict]):
        """階層情報を含むメタデータでドキュメントを追加"""
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
                    'file_type': 'markdown',
                    'file_size': doc.get('size', 0)
                })
                ids.append(f"{doc['sha']}_{i}")

        # 一括追加
        collection.add(
            documents=texts,
            metadatas=metadatas,
            ids=ids
        )

        print(f"Added {len(texts)} chunks from {len(documents)} files")

    def search(self, repo_name: str, query: str, n_results: int = 5) -> List[Dict]:
        """セマンティック検索"""
        try:
            collection = self.get_or_create_collection(repo_name)

            # 検索実行
            results = collection.query(
                query_texts=[query],
                n_results=n_results
            )

            # 結果整形
            search_results = []
            if results['documents'] and len(results['documents']) > 0:
                for doc, meta, distance in zip(
                    results['documents'][0],
                    results['metadatas'][0],
                    results['distances'][0]
                ):
                    search_results.append({
                        'content': doc,
                        'metadata': meta,
                        'score': 1 - (distance / 2)  # スコアに変換
                    })

            return search_results

        except Exception as e:
            print(f"Search error: {e}")
            return []


    def search_by_directory(self, repo_name: str, directory: str, query: str, n_results: int = 5) -> List[Dict]:
        """特定ディレクトリ内での検索"""
        try:
            collection = self.get_or_create_collection(repo_name)

            # ディレクトリフィルタ付き検索
            where_filter = {"directory": {"$eq": directory}} if directory else None

            results = collection.query(
                query_texts=[query],
                n_results=n_results * 2,  # 多めに取得してフィルタ
                where=where_filter
            )

            # 結果整形
            search_results = []
            if results['documents'] and len(results['documents']) > 0:
                for doc, meta, distance in zip(
                    results['documents'][0][:n_results],
                    results['metadatas'][0][:n_results],
                    results['distances'][0][:n_results]
                ):
                    search_results.append({
                        'content': doc,
                        'metadata': meta,
                        'score': 1 - (distance / 2)
                    })

            return search_results

        except Exception as e:
            print(f"Directory search error: {e}")
            return []