#!/bin/bash

# 抖音 API 服务停止脚本
# 作者: Douyin 翻译搬运助手项目
# 用途: 停止 Evil0ctal 的抖音下载 API 服务

echo "🛑 正在停止抖音 API 服务..."

# 查找并杀死 uvicorn 进程
PIDS=$(ps aux | grep "uvicorn.*app.main:app" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
    echo "ℹ️  未找到运行中的抖音 API 服务"
else
    echo "🔍 找到进程 ID: $PIDS"
    for PID in $PIDS; do
        echo "🔪 正在停止进程 $PID..."
        kill $PID
    done
    echo "✅ 抖音 API 服务已停止"
fi

# 也检查 Python start.py 进程
PYTHON_PIDS=$(ps aux | grep "python.*start.py" | grep -v grep | awk '{print $2}')

if [ ! -z "$PYTHON_PIDS" ]; then
    echo "🔍 找到 Python 进程 ID: $PYTHON_PIDS"
    for PID in $PYTHON_PIDS; do
        echo "🔪 正在停止 Python 进程 $PID..."
        kill $PID
    done
    echo "✅ Python 进程已停止"
fi 