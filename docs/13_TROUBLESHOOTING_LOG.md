# RAG API デプロイ トラブルシューティングログ

## 概要
VPS RAG APIのデプロイ過程で遭遇した問題と解決方法の記録

---

## 問題1: VPS初期ログインエラー

### 症状
- ConoHa VPSコンソールで`login incorrect`エラー
- 作成時に設定したパスワードでログインできない

### 原因
- VPS作成時のパスワード設定の問題
- 複雑なパスワードでの文字認識エラー

### 解決方法
```bash
# ConoHa管理画面でVPSを再構築
# 1. 管理画面 → VPS詳細 → 再構築
# 2. Ubuntu 24.04選択
# 3. シンプルなパスワードを設定
```

### 学んだ教訓
- VPS初回セットアップ時はシンプルなパスワードから開始
- 複雑なパスワードは後から変更する

---

## 問題2: SSH接続拒否エラー

### 症状
```bash
ssh root@160.251.211.37
# ssh: connect to host 160.251.211.37 port 22: Connection refused
```

### 原因
- **ConoHaセキュリティグループ**が設定されていない
- デフォルトでSSHポートが閉じられている

### 解決方法
```bash
# ConoHa管理画面で設定
# 1. VPS詳細 → セキュリティグループ
# 2. 「IPv4v6-SSH」を選択
# 3. 設定保存
```

### 学んだ教訓
- ConoHa VPSは明示的なセキュリティグループ設定が必要
- AWS EC2と同様のセキュリティモデル

---

## 問題3: SSH Password Authentication無効化失敗

### 症状
- `/etc/ssh/sshd_config`で`PasswordAuthentication no`設定済み
- それでもパスワード認証が可能

### 原因
- **Ubuntu 24.04**では`/etc/ssh/sshd_config.d/`ディレクトリの設定が優先
- `50-cloud-init.conf`が設定を上書き

### 解決方法
```bash
# cloud-init設定を無効化
sudo mv /etc/ssh/sshd_config.d/50-cloud-init.conf /etc/ssh/sshd_config.d/50-cloud-init.conf.backup
sudo systemctl restart ssh
```

### 学んだ教訓
- Ubuntu 24.04はSSH設定が分散化されている
- `sshd_config.d/`ディレクトリの確認が必要

---

## 問題4: SSH Service停止トラブル

### 症状
- `systemctl stop ssh.socket`実行後にSSH接続断
- 復旧できない状態

### 原因
- `ssh.socket`と`ssh.service`の依存関係を理解せずに操作
- 不適切な順序での停止

### 解決方法
```bash
# ConoHaコンソール経由で復旧
systemctl start ssh
systemctl enable ssh
systemctl disable ssh.socket
```

### 学んだ教訓
- SSH設定変更は必ず別セッションで確認
- systemdのサービス依存関係を理解する

---

## 問題5: Docker Compose環境変数認識エラー

### 症状
```bash
docker-compose -f docker-compose.prod.yml ps
# WARN[0000] The "API_SECRET_KEY" variable is not set. Defaulting to a blank string.
# passwordauthentication yes (設定は no のはず)
```

### 原因
- `docker-compose.prod.yml`で`${API_SECRET_KEY}`を参照
- シェル環境変数が設定されていない

### 解決方法
```yaml
# docker-compose.prod.yml修正前
environment:
  - API_SECRET_KEY=${API_SECRET_KEY}
  - GITHUB_TOKEN=${GITHUB_TOKEN}
env_file:
  - .env.prod

# 修正後
env_file:
  - .env.prod
environment:
  - ENV=production
  - PYTHONUNBUFFERED=1
```

### 学んだ教訓
- `env_file`で十分な場合は`environment`での変数参照を避ける
- シェル変数とコンテナ環境変数を混同しない

---

## 問題6: API認証キー不一致エラー

### 症状
```bash
curl -X POST http://localhost:8001/api/sync \
  -H 'Authorization: Bearer test123' \
  # {"detail":"Invalid authentication"}
```

### 原因
- **コード**: `os.getenv("API_SECRET_KEY")` を使用
- **設定**: `RAG_API_KEY=test123` を設定
- 環境変数名の不一致

### 解決方法
```python
# main.py修正
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != os.getenv("RAG_API_KEY"):  # 修正
        raise HTTPException(status_code=401, detail="Invalid authentication")
```

### 学んだ教訓
- 環境変数名の統一が重要
- コードと設定の整合性確認

---

## 問題7: Docker Cache問題

### 症状
- コード修正後も古い認証ロジックが動作
- 環境変数は正しいがアプリケーションが更新されない

### 原因
- **Docker Layer Cache**が古いコードを保持
- `docker-compose up -d`では既存イメージを再利用

### 解決方法
```bash
# 強制リビルド
sudo docker-compose -f docker-compose.prod.yml down
sudo docker-compose -f docker-compose.prod.yml build --no-cache
sudo docker-compose -f docker-compose.prod.yml up -d
```

### 学んだ教訓
- コード変更時は`--no-cache`でリビルド
- 設定のみ変更時は通常の再起動でOK

---

## 問題8: 特殊文字APIキーの問題

### 症状
- `eIC$!zpv8TI0#k`のような特殊文字含みキーで認証失敗
- zshで`!`が履歴展開エラー

### 原因
- シェルの特殊文字解釈
- URLエンコーディングの問題

### 解決方法
```bash
# 英数字のみのAPIキー生成
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
# または16進数
openssl rand -hex 16
```

### 学んだ教訓
- APIキーは英数字のみが安全
- 特殊文字は避ける

---

## 問題9: curlコマンドコピペミス

### 症状
- 環境変数は正しく設定済み
- 同じcurlコマンドで認証エラー

### 原因
- `.env.prod`のAPIキーは更新済み
- **curlコマンドのBearer値**を更新し忘れ

### 解決方法
```bash
# 間違い
curl -H 'Authorization: Bearer test123'  # 古いキー

# 正しい
curl -H 'Authorization: Bearer 4f5793c108119abe'  # 新しいキー
```

### 学んだ教訓
- 設定変更時はすべての箇所を確認
- コピペ時は値の整合性をチェック

---

## デバッグ手法まとめ

### 環境変数の確認方法
```bash
# コンテナ内の環境変数確認
docker-compose exec rag-api env | grep RAG_API_KEY

# アプリケーション内での確認
docker-compose exec rag-api python -c "import os; print(os.getenv('RAG_API_KEY'))"
```

### Docker関連のデバッグ
```bash
# キャッシュクリア
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# ログ確認
docker-compose logs -f rag-api
```

### SSH関連のデバッグ
```bash
# 設定確認
sshd -T | grep passwordauthentication
grep -r "PasswordAuthentication" /etc/ssh/

# ポート確認
ss -tlnp | grep :22
```

---

## 最終的な成功構成

### VPS環境
- **OS**: Ubuntu 24.04
- **Provider**: ConoHa VPS (2Core/1GB/100GB)
- **IP**: 160.251.211.37
- **Security**: SSH key authentication only

### API設定
- **URL**: http://160.251.211.37
- **API Key**: `4f5793c108119abe`
- **Authentication**: Bearer token
- **Endpoints**: /api/search, /api/sync, /health

### Docker構成
- **Production**: docker-compose.prod.yml
- **Development**: docker-compose.yml
- **Environment**: .env.prod
- **Build**: --no-cache for code changes

---

## 学習ポイント

1. **VPSセットアップ**: セキュリティグループ設定が必須
2. **SSH強化**: Ubuntu 24.04の分散設定を理解
3. **Docker運用**: キャッシュとリビルドのタイミング
4. **環境変数管理**: 命名規則と整合性
5. **認証設計**: シンプルで安全なAPIキー
6. **デバッグスキル**: 段階的な問題切り分け

この経験により、本番環境でのRAG APIデプロイメントが成功しました。