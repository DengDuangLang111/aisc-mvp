#!/bin/bash

cd "$(dirname "$0")/apps/api"

echo "🚀 启动后端服务器..."
nohup node -r dotenv/config dist/apps/api/src/main > /tmp/api.log 2>&1 &
echo "✅ 后端已启动，PID: $!"
echo "📋 查看日志: tail -f /tmp/api.log"
