# 既知の問題と注意事項

## ChromaDB データ管理

### 初回起動時の注意
- インデックス再構築が必要
- 初回同期には時間がかかる（リポジトリサイズによる）
- 大量ファイル処理時はメモリ使用量に注意

### データ確認コマンド
```bash
# ChromaDBデータ確認
docker-compose exec api python -c "from api.rag_system import get_collection_info; print(get_collection_info())"
```

## GitHub API 制限

### Rate Limit
- **認証済み**: 5000 requests/hour
- **未認証**: 60 requests/hour

### 対策
- Large repository処理時は分割実行推奨
- 必要に応じて処理間隔を調整
- APIトークンの正しい設定を確認

## VPS展開時の注意点

### SSL証明書
- Let's Encrypt使用時の設定
- 初回展開時はDNS設定の反映待ちが必要（最大48時間）

### メモリ管理
- VPS 1GB RAM環境での制限
- Docker コンテナは800MB制限設定済み
- 複数の重いプロセスの同時実行は避ける

## プロジェクト履歴

### 元プロジェクトからの移行
- `prj_vps_rag`: バックエンドの元実装
- `prj_text_editor_v1`: フロントエンド参考実装（`reference_v1/`として保存）

### 主要コンポーネントの参考実装
- `reference_v1/components/MarkdownEditor.tsx`: エディタコンポーネント
- `reference_v1/components/FileExplorer.tsx`: ファイル探索機能
- `reference_v1/hooks/useAutoSync.ts`: 自動同期フック

## 開発ロードマップ

### Phase 1: VPS展開 (完了)
- ✅ ConoHa VPS契約・セットアップ
- ⏳ 本番環境展開・動作確認
- ⏳ API性能テスト

### Phase 2: フロントエンド開発
- `reference_v1` を参考にNext.js再構築
- RAG API統合
- 認証・セキュリティ実装

### Phase 3: 機能拡張
- リアルタイム協作機能
- 高度な検索・フィルタリング
- モバイル対応

## 成功指標

- [ ] VPS上でRAG APIが正常動作
- [ ] GitHub リポジトリ統合が機能
- [ ] フロントエンドからAPI呼び出し成功
- [ ] SSL化・セキュリティ設定完了
- [ ] 実用的な検索性能達成（< 200ms）