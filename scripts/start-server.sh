#!/bin/bash

echo "🚀 启动抖音翻译搬运助手后端服务..."

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 构建依赖包
echo "📦 构建依赖包..."
cd packages/shared && pnpm build
cd ../server && pnpm build

# 启动服务器
echo "🔄 启动开发服务器..."
pnpm dev 