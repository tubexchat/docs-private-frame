#!/bin/bash
# =============================================================
# Cloudflare Pages 一键部署脚本 (Docusaurus + Pages Functions)
# =============================================================

set -e

echo "🚀 开始部署到 Cloudflare Pages..."
echo ""

# 检查 wrangler 是否安装
if ! command -v wrangler &> /dev/null; then
  echo "📦 安装 Wrangler CLI..."
  npm install -g wrangler
fi

# 构建项目
echo "🔨 构建 Docusaurus 项目..."
npm run build

echo ""
echo "☁️  上传到 Cloudflare Pages（含 Functions）..."
wrangler pages deploy build --project-name=docs-private-frame

echo ""
echo "✅ 部署完成！"
echo ""
echo "⚠️  提示：首次部署后请通过以下命令设置生产环境密码（Secret）："
echo "   wrangler pages secret put AUTH_PASSWORD --project-name=docs-private-frame"
echo "   wrangler pages secret put AUTH_SECRET   --project-name=docs-private-frame"
echo ""
echo "   AUTH_SECRET 建议使用随机 64 位字符串，例如："
echo "   openssl rand -base64 48"
