#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🛑 停止 Study Oasis 开发服务器...${NC}\n"

# 从 PID 文件读取
if [ -f /tmp/web.pid ]; then
    WEB_PID=$(cat /tmp/web.pid)
    if kill -0 $WEB_PID 2>/dev/null; then
        kill $WEB_PID
        echo -e "${GREEN}✅ 前端服务器已停止 (PID: $WEB_PID)${NC}"
    fi
    rm /tmp/web.pid
fi

if [ -f /tmp/api.pid ]; then
    API_PID=$(cat /tmp/api.pid)
    if kill -0 $API_PID 2>/dev/null; then
        kill $API_PID
        echo -e "${GREEN}✅ 后端服务器已停止 (PID: $API_PID)${NC}"
    fi
    rm /tmp/api.pid
fi

# 清理端口（以防万一）
echo -e "\n${YELLOW}🧹 清理端口...${NC}"
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:4000 | xargs kill -9 2>/dev/null

echo -e "${GREEN}✅ 所有服务器已停止${NC}\n"
