# VPS セットアップガイド

## 基本情報
- **VPS IP**: `160.251.211.37`
- **OS**: Ubuntu 24.04
- **構成**: 2Core / 1GB RAM / 100GB SSD

---

## 重要な前提条件

### ConoHaセキュリティグループ設定（必須）
ConoHa管理画面で以下の設定が必要です：
1. VPS詳細画面 → セキュリティグループ
2. 「IPv4v6-SSH」を選択（SSH接続に必須）
3. 後でWeb公開時は「IPv4v6-Web」も追加

**注意**: この設定をしないと外部からSSH接続できません。

---

## Phase 1: 初期セットアップ

### 1. SSH接続
```bash
ssh root@160.251.211.37
```
※ パスワードはConoHaで設定したrootパスワードを入力
※ 初回接続時はセキュリティグループで「IPv4v6-SSH」を選択する必要があります

### 2. システム更新
```bash
# システム全体の更新
apt update && apt upgrade -y

# 必要パッケージインストール
apt install -y curl wget git ufw fail2ban nano htop

# タイムゾーン設定（日本時間）
timedatectl set-timezone Asia/Tokyo

# 確認
date
```

---

## Phase 2: Dockerインストール

### 1. Docker Engine インストール
```bash
# Docker公式インストールスクリプト実行
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# インストール確認
docker --version
```

### 2. Docker Compose インストール
```bash
# Docker Compose バイナリダウンロード
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 実行権限付与
chmod +x /usr/local/bin/docker-compose

# インストール確認
docker-compose --version
```

### 3. Docker サービス設定
```bash
# Docker サービス開始
systemctl start docker

# 自動起動設定
systemctl enable docker

# 動作確認
docker run hello-world
```

---

## Phase 3: セキュリティ設定

### 1. ファイアウォール設定
```bash
# 必要ポートを許可
ufw allow ssh      # SSH (22)
ufw allow 80       # HTTP
ufw allow 443      # HTTPS

# ファイアウォール有効化
ufw --force enable

# 状態確認
ufw status
```

### 2. SSH攻撃対策
```bash
# fail2ban 開始・自動起動設定
systemctl start fail2ban
systemctl enable fail2ban

# 状態確認
systemctl status fail2ban
```

---

## Phase 4: プロジェクトデプロイ準備

### 1. プロジェクトディレクトリ作成
```bash
# プロジェクト用ディレクトリ作成
mkdir -p /opt/prj_text_editor_rag_v1
cd /opt/prj_text_editor_rag_v1
```

### 2. GitHubからソースコード取得
```bash
# リポジトリクローン（HTTPSで認証情報含む）
# Note: Replace YOUR_GITHUB_TOKEN with your actual token
git clone https://YOUR_GITHUB_TOKEN@github.com/wasborn14/prj_text_editor_rag_v1.git .

# ディレクトリ確認
ls -la
```

### 3. 本番環境設定ファイル作成
```bash
# backend ディレクトリに移動
cd backend

# 本番用環境変数ファイル作成
nano .env.prod
```

### 4. .env.prod ファイル内容
```bash
# GitHub API設定
GITHUB_TOKEN=your_github_personal_access_token_here

# RAG API設定
RAG_API_KEY=test123

# ChromaDB設定
CHROMADB_PERSIST_DIR=/app/data

# ログレベル
LOG_LEVEL=INFO

# API設定
API_HOST=0.0.0.0
API_PORT=8000
```

---

## Phase 5: Docker Compose本番デプロイ

### 1. 本番環境起動
```bash
# backend ディレクトリで実行
cd /opt/prj_text_editor_rag_v1/backend

# 本番環境起動
docker-compose -f docker-compose.prod.yml up -d

# 起動確認
docker-compose -f docker-compose.prod.yml ps
```

### 2. ログ確認
```bash
# API ログ確認
docker-compose -f docker-compose.prod.yml logs -f api

# 全体ログ確認
docker-compose -f docker-compose.prod.yml logs
```

### 3. API動作確認
```bash
# ヘルスチェック（ポート8001を使用）
curl http://localhost:8001/health

# API エンドポイント確認
curl http://localhost:8001/docs
```

---

## Phase 6: Nginx設定（リバースプロキシ）

### 1. Nginx インストール
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 2. Nginx設定ファイル作成
```bash
# 設定ファイル作成
nano /etc/nginx/sites-available/rag-api
```

### 3. Nginx設定内容
```nginx
server {
    listen 80;
    server_name 160.251.211.37;

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. Nginx設定有効化
```bash
# 設定ファイル有効化
ln -s /etc/nginx/sites-available/rag-api /etc/nginx/sites-enabled/

# デフォルト設定無効化
rm /etc/nginx/sites-enabled/default

# 設定テスト
nginx -t

# Nginx再起動
systemctl restart nginx
```

---

## Phase 7: 動作確認

### 1. 外部からのアクセス確認
```bash
# ローカルマシンから実行
curl http://160.251.211.37/health
curl http://160.251.211.37/docs
```

### 2. システム監視
```bash
# CPU・メモリ使用量確認
htop

# Docker コンテナ状況
docker ps

# ディスク使用量
df -h

# ログ確認
journalctl -u docker -f
```

---

## トラブルシューティング

### 1. Docker起動失敗
```bash
# Docker状態確認
systemctl status docker

# Dockerログ確認
journalctl -u docker

# Docker再起動
systemctl restart docker
```

### 2. ポート確認
```bash
# ポート使用状況確認
netstat -tlnp

# 特定ポート確認
ss -tlnp | grep :8001
```

### 3. ファイアウォール問題
```bash
# UFW状態確認
ufw status verbose

# ポート許可追加
ufw allow 8000
```

---

## 次のステップ

1. **SSL証明書設定** (Let's Encrypt)
2. **ドメイン設定** (オプション)
3. **監視・アラート設定**
4. **バックアップ設定**
5. **フロントエンド開発開始**

---

## 重要なコマンド

```bash
# サービス再起動
docker-compose -f docker-compose.prod.yml restart

# ログ監視
docker-compose -f docker-compose.prod.yml logs -f api

# システム全体再起動
reboot

# VPS接続
ssh root@160.251.211.37
```

---

**セットアップ完了後、`http://160.251.211.37/health` でAPIが正常動作することを確認してください。**