#!/bin/bash
set -e

echo "🚀 Deploying VPS RAG System..."

# 設定
REPO_URL="https://github.com/your-username/prj_text_editor_rag_v1.git"
DEPLOY_DIR="/home/raguser/rag-system"
PROJECT_NAME="prj_text_editor_rag_v1"

# 色付きメッセージ用の関数
info() { echo -e "\033[1;34m$1\033[0m"; }
success() { echo -e "\033[1;32m$1\033[0m"; }
warning() { echo -e "\033[1;33m$1\033[0m"; }
error() { echo -e "\033[1;31m$1\033[0m"; }

# VPSに展開
cd $DEPLOY_DIR

if [ -d "$PROJECT_NAME" ]; then
    info "📥 Updating existing deployment..."
    cd $PROJECT_NAME
    git pull origin main
else
    info "📥 Initial deployment..."
    git clone $REPO_URL
    cd $PROJECT_NAME
fi

# バックエンドディレクトリに移動
cd backend

# 環境設定確認
if [ ! -f ".env.prod" ]; then
    warning "🔧 Creating production environment file..."
    cp .env.example .env.prod 2>/dev/null || {
        cat > .env.prod << EOF
# VPS RAG Production Environment
ENV=production
API_SECRET_KEY=your-strong-secret-key-here
GITHUB_TOKEN=ghp_your-github-token-here

# Security settings
PYTHONPATH=/app
PYTHONUNBUFFERED=1
EOF
    }
    warning "⚠️  Please edit .env.prod with your production values:"
    warning "   - API_SECRET_KEY (strong random string)"
    warning "   - GITHUB_TOKEN (your GitHub personal access token)"
    read -p "Press Enter after editing .env.prod..."
fi

# Docker展開
info "🐳 Starting Docker services..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# ヘルスチェック
info "🏥 Performing health check..."
sleep 15

for i in {1..5}; do
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        success "✅ Deployment successful!"
        success "🌐 API is running at http://localhost:8001"

        # 簡単な動作テスト
        info "🧪 Running basic API test..."
        if curl -f http://localhost:8001/ > /dev/null 2>&1; then
            success "✅ Basic API test passed"
        fi

        exit 0
    else
        warning "⏳ Health check attempt $i/5 failed, retrying in 10 seconds..."
        sleep 10
    fi
done

error "❌ Health check failed after 5 attempts"
error "📋 Checking logs..."
docker-compose -f docker-compose.prod.yml logs --tail=20
exit 1