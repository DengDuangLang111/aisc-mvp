#!/bin/bash

cd "$(dirname "$0")/apps/web"

echo "🎨 启动前端服务器..."
nohup pnpm dev > /tmp/web.log 2>&1 &
echo "✅ 前端已启动，PID: $!"
echo "📋 查看日志: tail -f /tmp/web.log"
