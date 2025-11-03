#!/bin/bash

# Study Oasis 开发环境 Bash/Zsh 别名配置
# 
# 使用方法：
# 1. 将本文件复制到项目根目录
# 2. 在 ~/.zshrc 或 ~/.bashrc 中添加：
#    alias study-oasis='source /path/to/study-oasis-aliases.sh'
# 3. 重启终端或运行 'source ~/.zshrc'
# 4. 之后就可以使用各种简便命令了

# 项目根目录
STUDY_OASIS_ROOT="/Users/knight/study_oasis_simple"

# 核心命令
alias start="cd $STUDY_OASIS_ROOT && ./start-servers.sh"
alias stop="cd $STUDY_OASIS_ROOT && ./stop-servers.sh"
alias restart="stop && sleep 2 && start"

# 日志命令
alias logs-web="tail -f /tmp/web.log"
alias logs-api="tail -f /tmp/api.log"
alias logs-both="tail -f /tmp/web.log /tmp/api.log"
alias logs-web-50="tail -50 /tmp/web.log"
alias logs-api-50="tail -50 /tmp/api.log"

# 端口检查
alias check-ports="echo '=== 端口 3000 ===' && lsof -i :3000 || echo '未占用' && echo '=== 端口 4001 ===' && lsof -i :4001 || echo '未占用'"
alias clean-ports="lsof -ti:3000,4001 | xargs kill -9 2>/dev/null && echo '✅ 端口已清理'"

# 进程管理
alias ps-study="ps aux | grep -E 'node|next dev|pnpm' | grep -v grep"
alias kill-all="pkill -f 'node' && pkill -f 'next dev' && echo '✅ 所有进程已杀死'"

# 快速导航
alias go-root="cd $STUDY_OASIS_ROOT"
alias go-api="cd $STUDY_OASIS_ROOT/apps/api"
alias go-web="cd $STUDY_OASIS_ROOT/apps/web"

# 开发命令
alias dev-api="cd $STUDY_OASIS_ROOT/apps/api && PORT=4001 pnpm start:dev"
alias dev-web="cd $STUDY_OASIS_ROOT/apps/web && PORT=3000 pnpm dev"

# 测试命令
alias test-all="cd $STUDY_OASIS_ROOT && pnpm test"
alias test-api="cd $STUDY_OASIS_ROOT/apps/api && pnpm test"
alias test-web="cd $STUDY_OASIS_ROOT/apps/web && pnpm test"

# 构建命令
alias build-all="cd $STUDY_OASIS_ROOT && pnpm build"
alias build-api="cd $STUDY_OASIS_ROOT/apps/api && pnpm build"
alias build-web="cd $STUDY_OASIS_ROOT/apps/web && pnpm build"

# 清理命令
alias clean-all="cd $STUDY_OASIS_ROOT && rm -rf node_modules apps/*/node_modules && pnpm install && echo '✅ 环境重置完成'"
alias clean-cache="rm -rf $STUDY_OASIS_ROOT/apps/web/.next && echo '✅ 前端缓存已清理'"

# 信息命令
alias info="echo '=== Study Oasis 环境信息 ===' && echo 'Web: http://localhost:3000' && echo 'API: http://localhost:4001' && echo 'API Docs: http://localhost:4001/api/docs' && echo '日志: /tmp/web.log, /tmp/api.log'"
alias help-study="echo '💡 常用命令:' && echo '  start        - 启动所有服务' && echo '  stop         - 停止所有服务' && echo '  restart      - 重启所有服务' && echo '  logs-web     - 查看前端日志' && echo '  logs-api     - 查看后端日志' && echo '  check-ports  - 检查端口占用' && echo '  clean-ports  - 清理端口' && echo '  go-api       - 进入后端目录' && echo '  go-web       - 进入前端目录' && echo '  dev-api      - 只启动后端' && echo '  dev-web      - 只启动前端' && echo '  test-all     - 运行所有测试' && echo '  info         - 显示服务器信息'"

echo "✅ Study Oasis 别名已加载"
echo "   运行 'help-study' 查看所有命令"
