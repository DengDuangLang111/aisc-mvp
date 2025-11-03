# 🚀 服务器启动和管理完整指南

这是 Study Oasis 项目的开发服务器启动和管理指南。包含所有你需要知道的快捷命令和技巧。

---

## 目录

1. [⚡ 快速启动](#快速启动)
2. [🛑 停止和重启](#停止和重启)
3. [📊 查看日志](#查看日志)
4. [🎯 便捷别名](#便捷别名)
5. [🔧 故障排除](#故障排除)
6. [💡 高级用法](#高级用法)

---

## 快速启动

### 方式一：一键启动（最简单）✨

```bash
./start-servers.sh
```

**只需这一个命令！** 脚本会自动：

- 🧹 清理占用的端口
- 🚀 启动后端 API (NestJS) - 端口 4001
- 🎨 启动前端 Web (Next.js) - 端口 3000  
- ✅ 验证服务就绪
- 📊 持续监控服务状态
- 📝 显示日志文件位置

### 输出示例

```
🚀 启动 Study Oasis 开发服务器...

📋 检查端口占用...
✅ 端口已清理

🔧 启动后端服务器 (端口 4001)...
✅ 后端进程 ID: 12345
⏳ 等待后端就绪...
✅ 后端已就绪！

🎨 启动前端服务器 (端口 3000)...
✅ 前端进程 ID: 12346
⏳ 等待前端就绪...
✅ 前端已就绪！

🎉 所有服务器启动成功！

📡 服务器地址：
  🌐 前端: http://localhost:3000
  🔌 后端: http://localhost:4001

📋 日志文件：
  前端: /tmp/web.log
  后端: /tmp/api.log

💡 提示：
  - 查看前端日志: tail -f /tmp/web.log
  - 查看后端日志: tail -f /tmp/api.log
  - 按 Ctrl+C 退出监控 (服务器继续运行)
```

**立即访问**: 🌐 http://localhost:3000

---

## 停止和重启

### 停止服务

```bash
./stop-servers.sh
```

输出示例：

```
🛑 停止 Study Oasis 开发服务器...

✅ 前端服务器已停止 (PID: 12346)
✅ 后端服务器已停止 (PID: 12345)
🧹 清理端口...
✅ 所有服务器已停止
```

### 重启服务

```bash
./stop-servers.sh && sleep 2 && ./start-servers.sh
```

或者（如果配置了别名）：

```bash
restart
```

### 强制停止所有进程

```bash
# 列出所有 Node 进程
ps aux | grep -E "node|next|pnpm" | grep -v grep

# 按 PID 杀死进程
kill 12345 12346

# 或强制清理占用的端口
lsof -ti:3000,4001 | xargs kill -9
```

---

## 查看日志

### 实时查看前端日志

```bash
tail -f /tmp/web.log
```

常见的前端日志：
```
✓ Compiled in 234ms
✓ Ready in 1.2s
GET /chat 200 in 45ms
```

### 实时查看后端日志

```bash
tail -f /tmp/api.log
```

常见的后端日志：
```
[Nest] 12345 - 11/02/2025, 7:41:22 AM     LOG [RoutesResolver]
[Nest] 12345 - 11/02/2025, 7:41:22 AM     LOG [NestFactory]
Starting Nest application...
```

### 查看最后 N 行日志

```bash
# 前端最后 50 行
tail -50 /tmp/web.log

# 后端最后 50 行
tail -50 /tmp/api.log

# 后端最后 100 行，过滤错误
tail -100 /tmp/api.log | grep -i error
```

### 搜索日志

```bash
# 在前端日志中查找特定内容
grep "error" /tmp/web.log

# 在后端日志中查找特定内容
grep "error" /tmp/api.log

# 统计错误出现次数
grep -c "error" /tmp/api.log

# 查看上一个小时的日志（Linux/Mac）
tail -f /tmp/web.log | while IFS= read -r line; do
  echo "$(date '+%Y-%m-%d %H:%M:%S') $line"
done
```

### 清空日志

```bash
# 清空前端日志
> /tmp/web.log

# 清空后端日志
> /tmp/api.log

# 清空所有日志
> /tmp/web.log && > /tmp/api.log
```

---

## 便捷别名

### 设置别名（一次性配置）

1. 查看别名文件：

```bash
cat study-oasis-aliases.sh
```

2. 添加到 shell 配置文件：

```bash
# 对于 Zsh 用户
echo "source /Users/knight/study_oasis_simple/study-oasis-aliases.sh" >> ~/.zshrc

# 对于 Bash 用户
echo "source /Users/knight/study_oasis_simple/study-oasis-aliases.sh" >> ~/.bashrc
```

3. 重启终端或运行：

```bash
source ~/.zshrc  # 或 source ~/.bashrc
```

### 使用别名

设置后，你可以使用这些简短命令：

```bash
# 核心命令
start            # 启动所有服务
stop             # 停止所有服务
restart          # 重启所有服务

# 日志命令
logs-web         # 实时查看前端日志
logs-api         # 实时查看后端日志
logs-both        # 同时查看前端和后端日志
logs-web-50      # 查看前端最后 50 行
logs-api-50      # 查看后端最后 50 行

# 端口检查
check-ports      # 检查 3000 和 4001 端口占用
clean-ports      # 强制清理占用的端口

# 进程管理
ps-study         # 查看 Study Oasis 相关进程
kill-all         # 杀死所有 Node 进程

# 快速导航
go-root          # 进入项目根目录
go-api           # 进入后端目录
go-web           # 进入前端目录

# 开发命令
dev-api          # 只启动后端
dev-web          # 只启动前端

# 测试命令
test-all         # 运行所有测试
test-api         # 运行后端测试
test-web         # 运行前端测试

# 构建命令
build-all        # 构建整个项目
build-api        # 构建后端
build-web        # 构建前端

# 清理命令
clean-all        # 完整重置环境
clean-cache      # 清理前端缓存

# 信息命令
info             # 显示服务器地址和日志位置
help-study       # 显示所有可用命令
```

### 别名使用示例

```bash
# 快速启动并查看日志
start && logs-both

# 修改完代码后快速重启
restart

# 检查端口占用
check-ports

# 清理环境并重新启动
clean-all && start
```

---

## 故障排除

### 问题 1: 启动脚本没有权限

**错误信息**: `Permission denied`

**解决方案**:

```bash
chmod +x start-servers.sh stop-servers.sh
./start-servers.sh
```

### 问题 2: 端口 3000 或 4001 已被占用

**错误信息**: `EADDRINUSE: address already in use :::3000`

**解决方案 1 - 自动清理**（脚本会自动做）：
```bash
./start-servers.sh  # 脚本会自动清理占用的端口
```

**解决方案 2 - 手动清理**：
```bash
# 查看占用情况
lsof -i :3000
lsof -i :4001

# 杀死占用进程
lsof -ti:3000 | xargs kill -9
lsof -ti:4001 | xargs kill -9

# 重新启动
./start-servers.sh
```

### 问题 3: 启动超时

**错误信息**: `后端启动超时` 或 `前端启动超时`

**解决方案**:

```bash
# 1. 查看日志找出问题
tail -50 /tmp/api.log
tail -50 /tmp/web.log

# 2. 检查依赖是否安装
pnpm install

# 3. 清理缓存并重新启动
rm -rf apps/web/.next
./stop-servers.sh
./start-servers.sh
```

### 问题 4: 后端无法连接数据库

**错误信息**: `ECONNREFUSED: Database connection failed`

**解决方案**:

```bash
# 1. 检查数据库环境变量
cat apps/api/.env

# 2. 确认数据库服务运行中
# 如果使用本地 PostgreSQL
psql -U postgres -d study_oasis -c "SELECT version();"

# 3. 运行数据库迁移
cd apps/api
npx prisma migrate dev

# 4. 重启后端
./stop-servers.sh
./start-servers.sh
```

### 问题 5: 前端页面白屏

**症状**: 访问 http://localhost:3000 显示白屏

**解决方案**:

```bash
# 1. 检查前端日志
tail -50 /tmp/web.log

# 2. 清理缓存
rm -rf apps/web/.next

# 3. 硬刷新浏览器
# macOS: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + R

# 4. 重启前端
cd apps/web
pnpm dev
```

### 问题 6: 修改代码后没有自动更新

**症状**: 修改了代码但页面/API 没有变化

**解决方案**:

```bash
# 前端：清理缓存
rm -rf apps/web/.next

# 后端：确认启用了 dev mode
# 后端应该看到这样的日志：
# [Nest] 12345 - 11/02/2025, 7:41:22 AM LOG Nest application successfully started

# 如果没有热重载，手动重启
./stop-servers.sh
./start-servers.sh

# 浏览器硬刷新
# macOS: Cmd + Shift + R
# Windows: Ctrl + F5
```

### 问题 7: npm/pnpm 依赖错误

**错误信息**: `ERR_PNPM_INSTALL_FAIL` 或 `npm ERR! code ENOENT`

**解决方案**:

```bash
# 1. 清理旧的 node_modules 和 lock 文件
rm -rf node_modules apps/*/node_modules pnpm-lock.yaml

# 2. 重新安装
pnpm install

# 3. 重启服务
./start-servers.sh
```

### 快速诊断脚本

```bash
#!/bin/bash
echo "=== Study Oasis 诊断 ==="
echo ""
echo "1. Node 版本:"
node --version
echo ""
echo "2. pnpm 版本:"
pnpm --version
echo ""
echo "3. 端口占用情况:"
lsof -i :3000,4001 || echo "  无占用"
echo ""
echo "4. 正在运行的进程:"
ps aux | grep -E "node|next|pnpm" | grep -v grep || echo "  无相关进程"
echo ""
echo "5. 数据库连接:"
curl -s http://localhost:4001/health || echo "  后端未运行"
echo ""
echo "6. 前端状态:"
curl -s http://localhost:3000 | head -c 100 && echo "... ✅" || echo "  前端未运行"
```

---

## 高级用法

### 在不同终端运行各个服务

**好处**: 每个服务单独输出日志，便于调试

```bash
# 终端 1：启动后端
cd apps/api
PORT=4001 pnpm start:dev

# 终端 2：启动前端
cd apps/web
PORT=3000 pnpm dev

# 终端 3：监控日志
tail -f /tmp/web.log /tmp/api.log
```

### 使用 tmux 后台运行

**好处**: 不占用当前终端，可以断开连接后继续运行

```bash
# 创建并启动会话
tmux new-session -d -s study-oasis './start-servers.sh'

# 查看会话中的输出
tmux capture-pane -p -t study-oasis

# 连接到会话
tmux attach-session -t study-oasis

# 离开会话（保持运行）
# 按 Ctrl+B，然后按 D

# 停止会话
tmux kill-session -t study-oasis

# 查看所有会话
tmux list-sessions
```

### 使用 screen 后台运行

```bash
# 启动新的 screen 会话
screen -S study-oasis

# 运行启动脚本
./start-servers.sh

# 离开会话（保持运行）
# 按 Ctrl+A，然后按 D

# 重新连接
screen -r study-oasis

# 终止会话
screen -X -S study-oasis quit
```

### 使用 Docker 运行（可选）

```bash
# 如果已安装 Docker
docker-compose up

# 后台运行
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 性能监控

```bash
# 实时监控 CPU 和内存
top

# 查看具体的 Node 进程
ps aux | grep node

# 监控端口流量
lsof -i -P -n | grep -i "3000\|4001"

# 高级监控工具（如果已安装）
htop
```

---

## 🎯 最常用的三个命令

记住这三个就够了！🎉

```bash
# 1. 启动所有服务
./start-servers.sh

# 2. 查看日志
tail -f /tmp/web.log /tmp/api.log

# 3. 停止所有服务
./stop-servers.sh
```

---

## 💡 最后的建议

1. **保存这个文档**: 加入浏览器书签或保存到本地
2. **设置别名**: 省时又方便，一次配置，长期使用
3. **定期清理日志**: `> /tmp/web.log` 和 `> /tmp/api.log`
4. **监控磁盘空间**: 日志文件会持续增长
5. **使用版本控制**: 确保代码修改都被提交到 Git

---

**需要帮助？** 查看 [问题排除](#故障排除) 部分或联系技术支持。

**祝开发愉快！** 🚀
