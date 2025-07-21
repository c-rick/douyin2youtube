#!/bin/bash

# 抖音 API 服务启动脚本
# 作者: Douyin 翻译搬运助手项目
# 用途: 启动 Evil0ctal 的抖音下载 API 服务

set -e  # 遇到错误时退出

# 检查是否在项目根目录
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查 external/douyin-api 目录是否存在
if [ ! -d "external/douyin-api" ]; then
    echo "❌ 错误: external/douyin-api 目录不存在"
    echo "请先运行: git submodule update --init --recursive"
    exit 1
fi

# 检查 Python 是否安装
if command -v python3 &> /dev/null; then
    PYTHON_BIN=$(command -v python3)
elif command -v python &> /dev/null; then
    PYTHON_BIN=$(command -v python)
else
    echo "❌ 错误: 未找到 Python，请先安装 Python 或 Python3"
    exit 1
fi


echo "✅ 使用 Python: $PYTHON_BIN"

echo "🚀 启动抖音 API 服务..."
echo "📍 服务地址: http://localhost:8000"
echo "📖 API 文档: http://localhost:8000/docs"
echo "🔄 按 Ctrl+C 停止服务"
echo ""

# 切换到 douyin-api 目录并启动服务
cd external/douyin-api

# 检查依赖是否安装
if [ ! -f "requirements.txt" ]; then
    echo "❌ 错误: 未找到 requirements.txt 文件"
    exit 1
fi

echo "📦 检查 Python 依赖..."
$PYTHON_BIN -c "import fastapi, uvicorn" 2>/dev/null || {
    echo "⚠️  警告: Python 依赖未完全安装"
    echo "请运行: cd external/douyin-api && pip install -r requirements.txt"
    echo ""
    echo "🔄 正在尝试启动服务..."
}

# 启动服务
$PYTHON_BIN start.py 