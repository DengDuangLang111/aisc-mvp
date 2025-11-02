# 🚀 Study Oasis - 快速参考卡

## ⚡ 快速启动

```bash
cd /Users/knight/study_oasis_simple
./start-servers.sh
```

或手动启动：

```bash
# 终端 1: API 服务
cd apps/api
pnpm build
node dist/apps/api/src/main.js

# 终端 2: Web 应用
cd apps/web
pnpm dev
```

## 🌐 访问地址

| 服务 | 地址 | 状态 |
|------|------|------|
| 前端应用 | http://localhost:3000 | ✅ |
| API 服务 | http://localhost:4001 | ✅ |
| 健康检查 | http://localhost:4001/health | ✅ |

## 📁 项目结构

```
study_oasis_simple/
├── apps/
│   ├── api/              # NestJS 后端
│   │   ├── src/
│   │   │   ├── chat/     # AI 聊天功能
│   │   │   ├── upload/   # 文件上传
│   │   │   └── storage/  # GCS 集成
│   │   └── prisma/       # 数据库 ORM
│   └── web/              # Next.js 前端
│       └── app/
│           ├── chat/     # 聊天页面
│           └── upload/   # 上传页面
├── SYSTEM_OPERATIONAL.md        # 系统运行指南
└── PROJECT_COMPLETION_REPORT.md # 完整报告
```

## 🔧 常用命令

### 开发相关
```bash
# 启动 API 开发模式
cd apps/api && pnpm dev

# 启动前端开发模式
cd apps/web && pnpm dev

# 构建生产版本
cd apps/api && pnpm build
cd apps/web && pnpm build

# 运行测试
cd apps/api && pnpm test
cd apps/web && pnpm test

# 检查代码质量
pnpm lint
```

### 数据库相关
```bash
# 运行迁移
cd apps/api && pnpm prisma migrate dev

# 生成 Prisma 客户端
pnpm prisma generate

# 打开 Prisma Studio
pnpm prisma studio

# 验证数据库连接
psql $DATABASE_URL -c "SELECT 1"
```

### API 测试
```bash
# 健康检查
curl http://localhost:4001/health

# 上传文件
curl -X POST http://localhost:4001/upload \
  -F "file=@/path/to/file.txt"

# AI 聊天
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好"}'

# 查看日志
tail -f /tmp/api.log
```

## 📋 API 端点参考

### 文件上传
```
POST /upload
Content-Type: multipart/form-data

Response:
{
  "id": "string",
  "filename": "string",
  "url": "string",
  "size": number,
  "documentId": "string",
  "ocrStatus": "pending"
}
```

### AI 聊天
```
POST /chat
Content-Type: application/json

{
  "message": "你的问题",
  "uploadId": "可选的文件ID"
}

Response:
{
  "reply": "AI回复",
  "hintLevel": 1,
  "tokensUsed": number
}
```

### 健康检查
```
GET /health

Response:
{
  "status": "healthy",
  "uptime": number
}
```

## 🔐 环境变量配置

主要配置位置：`/apps/api/.env`

```env
# API 配置
API_PORT=4001
NODE_ENV=development

# DeepSeek API
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=study-oasis-477006
GCS_BUCKET_NAME=study-oasis-uploads

# 数据库
DATABASE_URL=postgresql://...?pgbouncer=true

# 前端配置
NEXT_PUBLIC_API_URL=http://localhost:4001
```

## 🐛 故障排查

### 问题：API 无法启动

**检查步骤**:
1. 验证 Node.js 版本: `node -v`
2. 检查依赖安装: `cd apps/api && pnpm install`
3. 检查环境变量: `cat .env`
4. 查看错误日志: `tail -100 /tmp/api.log`

### 问题：文件上传失败

**检查步骤**:
1. 验证 GCS 权限: 查看 google-cloud-key.json
2. 检查网络连接: `curl https://www.google.com`
3. 查看上传日志: `grep "upload" /tmp/api.log`

### 问题：AI 不回复

**检查步骤**:
1. 验证 API Key: `echo $DEEPSEEK_API_KEY`
2. 测试网络连接: `curl https://api.deepseek.com`
3. 查看 AI 日志: `grep "DeepSeek" /tmp/api.log`

### 问题：数据库连接失败

**检查步骤**:
1. 验证连接字符串: `echo $DATABASE_URL`
2. 测试连接: `psql $DATABASE_URL -c "SELECT 1"`
3. 检查 pgbouncer 配置

## 📊 系统监控

### 实时日志监控
```bash
# API 日志
tail -f /tmp/api.log

# 实时搜索错误
tail -f /tmp/api.log | grep ERROR
```

### 进程监控
```bash
# 查看运行中的服务
ps aux | grep "node\|next"

# 查看端口占用
lsof -i :4001
lsof -i :3000
```

### 性能监控
```bash
# 内存使用
top

# CPU 使用
prstat

# 磁盘使用
df -h
```

## 🎯 工作流

### 典型使用场景

#### 1. 上传文件并提问
```bash
# 1. 上传文件
UPLOAD=$(curl -X POST http://localhost:4001/upload -F "file=@document.txt")
DOC_ID=$(echo $UPLOAD | jq -r '.documentId')

# 2. 提出问题
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"总结一下\",\"uploadId\":\"$DOC_ID\"}"
```

#### 2. 连续对话
```bash
# 1. 初始对话
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"什么是递归?"}'

# 2. 后续提问
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"能给个例子吗?"}'
```

## 📚 文档链接

- 📖 [系统运行指南](./SYSTEM_OPERATIONAL.md)
- 📋 [完整实现报告](./PROJECT_COMPLETION_REPORT.md)
- 🏗️ [项目说明](./README.md)

## ✅ 检查清单

启动应用前，确保：

- [ ] Node.js v20+ 已安装
- [ ] pnpm 已安装
- [ ] 环境变量已配置（.env）
- [ ] 数据库连接正常
- [ ] GCS 凭证已配置
- [ ] DeepSeek API Key 已配置
- [ ] 端口 3000 和 4001 未被占用

## 🆘 获取帮助

遇到问题时：

1. 查看 [系统运行指南](./SYSTEM_OPERATIONAL.md)
2. 检查日志文件：`/tmp/api.log`
3. 验证环境变量配置
4. 测试 API 端点的健康状态
5. 查看浏览器控制台输出

---

**最后更新**: 2025-11-02  
**系统状态**: ✅ 全面运行  
**质量评级**: ⭐⭐⭐⭐⭐
