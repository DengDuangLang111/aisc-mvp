#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 启动 Study Oasis 开发服务器...${NC}\n"

# 检查并清理端口
echo -e "${YELLOW}📋 检查端口占用...${NC}"
if lsof -ti:3000 > /dev/null 2>&1; then
    echo -e "${RED}⚠️  端口 3000 被占用，正在清理...${NC}"
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    sleep 1
fi

if lsof -ti:4001 > /dev/null 2>&1; then
    echo -e "${RED}⚠️  端口 4001 被占用，正在清理...${NC}"
    lsof -ti:4001 | xargs kill -9 2>/dev/null
    sleep 1
fi

echo -e "${GREEN}✅ 端口已清理${NC}\n"

# 启动后端服务器
echo -e "${YELLOW}🔧 启动后端服务器 (端口 4001)...${NC}"
cd /Users/knight/study_oasis_simple/apps/api
node dist/apps/api/src/main.js > /tmp/api.log 2>&1 &
API_PID=$!
echo -e "${GREEN}✅ 后端进程 ID: $API_PID${NC}"

# 等待后端启动
echo -e "${YELLOW}⏳ 等待后端就绪...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:4001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端已就绪！${NC}\n"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ 后端启动超时${NC}"
        tail -20 /tmp/api.log
        exit 1
    fi
    sleep 1
done

# 启动前端服务器
echo -e "${YELLOW}🎨 启动前端服务器 (端口 3000)...${NC}"
cd /Users/knight/study_oasis_simple/apps/web
pnpm dev > /tmp/web.log 2>&1 &
WEB_PID=$!
echo -e "${GREEN}✅ 前端进程 ID: $WEB_PID${NC}"

# 等待前端启动
echo -e "${YELLOW}⏳ 等待前端就绪...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端已就绪！${NC}\n"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ 前端启动超时${NC}"
        tail -20 /tmp/web.log
        kill $API_PID 2>/dev/null
        exit 1
    fi
    sleep 1
done

# 显示服务器信息
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 所有服务器启动成功！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📡 服务器地址：${NC}"
echo -e "  🌐 前端: ${GREEN}http://localhost:3000${NC}"
echo -e "  🔌 后端: ${GREEN}http://localhost:4001${NC}\n"

echo -e "${YELLOW}📝 进程 ID：${NC}"
echo -e "  前端: $WEB_PID"
echo -e "  后端: $API_PID\n"

echo -e "${YELLOW}📋 日志文件：${NC}"
echo -e "  前端: /tmp/web.log"
echo -e "  后端: /tmp/api.log\n"

echo -e "${YELLOW}🛑 停止服务器：${NC}"
echo -e "  kill $WEB_PID $API_PID"
echo -e "  或者运行: ${GREEN}./stop-servers.sh${NC}\n"

echo -e "${YELLOW}💡 提示：${NC}"
echo -e "  - 查看前端日志: tail -f /tmp/web.log"
echo -e "  - 查看后端日志: tail -f /tmp/api.log"
echo -e "  - 服务器将在后台持续运行"
echo -e "  - 按 Ctrl+C 退出此脚本（服务器继续运行）\n"

# 保存进程 ID
echo "$WEB_PID" > /tmp/web.pid
echo "$API_PID" > /tmp/api.pid

echo -e "${GREEN}✨ 开发环境已准备就绪！${NC}\n"

# 持续监控服务器状态
echo -e "${YELLOW}🔍 监控服务器状态 (每 10 秒检查一次)...${NC}"
echo -e "${YELLOW}按 Ctrl+C 退出监控 (服务器继续运行)${NC}\n"

while true; do
    sleep 10
    
    # 检查前端
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${RED}❌ 前端服务器掉线！${NC}"
        tail -10 /tmp/web.log
    fi
    
    # 检查后端
    if ! curl -s http://localhost:4001/health > /dev/null 2>&1; then
        echo -e "${RED}❌ 后端服务器掉线！${NC}"
        tail -10 /tmp/api.log
    fi
done
