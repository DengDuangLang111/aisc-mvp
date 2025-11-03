# 🚀 Study Oasis 启动速查表

## 最快启动（复制粘贴）

```bash
./start-servers.sh
```

**就这一个命令！** ✨

---

## 常用命令速查

### 启动和停止
```bash
./start-servers.sh    # ▶️  启动所有服务
./stop-servers.sh     # ⏹️  停止所有服务
```

### 查看日志
```bash
tail -f /tmp/web.log   # 前端日志（实时）
tail -f /tmp/api.log   # 后端日志（实时）
tail -f /tmp/web.log /tmp/api.log   # 同时查看两个
```

### 端口管理
```bash
lsof -i :3000          # 查看 3000 端口占用
lsof -i :4001          # 查看 4001 端口占用
lsof -ti:3000,4001 | xargs kill -9   # 强制清理端口
```

### 进程管理
```bash
ps aux | grep node     # 查看所有 Node 进程
pkill -f "next dev"    # 杀死 Next.js 进程
```

---

## 如果使用了别名配置

### 设置别名（一次性）

```bash
# 复制别名文件到 shell 配置
echo "source /Users/knight/study_oasis_simple/study-oasis-aliases.sh" >> ~/.zshrc
source ~/.zshrc
```

### 之后就可以用简短命令

```bash
start          # ▶️  启动
stop           # ⏹️  停止
restart        # 🔄 重启

logs-web       # 前端日志
logs-api       # 后端日志
logs-both      # 两个日志

check-ports    # 检查端口
clean-ports    # 清理端口

go-web         # 进入前端目录
go-api         # 进入后端目录

test-all       # 运行测试
build-all      # 构建项目

help-study     # 显示所有命令
```

---

## 访问地址

| 功能 | 地址 |
|------|------|
| 🌐 前端应用 | http://localhost:3000 |
| 🔌 后端 API | http://localhost:4001 |
| 📚 API 文档 | http://localhost:4001/api/docs |
| 💚 健康检查 | http://localhost:4001/health |

---

## 故障排除

### 端口已占用
```bash
./start-servers.sh    # 脚本自动清理占用
# 或手动
lsof -ti:3000,4001 | xargs kill -9
```

### 启动脚本无权限
```bash
chmod +x start-servers.sh stop-servers.sh
./start-servers.sh
```

### 查看启动错误
```bash
tail -50 /tmp/web.log
tail -50 /tmp/api.log
```

### 完整重启
```bash
./stop-servers.sh
rm -rf apps/web/.next
./start-servers.sh
```

---

## 详细文档

📖 **完整指南**: [docs/SERVER_STARTUP_GUIDE.md](./docs/SERVER_STARTUP_GUIDE.md)

📖 **快速开始**: [QUICK_START_SERVERS.md](./QUICK_START_SERVERS.md)

---

## 💡 记住这个就够了

```bash
./start-servers.sh
```

一键启动，自动管理，省时省力！🎉
