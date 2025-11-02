# 云部署完整方案

## 🏗️ 完整云架构

```
┌────────────────────────────────────────────────────────────┐
│                      全球用户                               │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│               Vercel (前端托管 + CDN)                       │
│  - Next.js 自动部署                                         │
│  - Edge Network (全球 <100ms 延迟)                          │
│  - 自动 HTTPS                                               │
└──────────────────────┬─────────────────────────────────────┘
                       │ API 请求
                       ▼
┌────────────────────────────────────────────────────────────┐
│              Railway / Fly.io (后端托管)                    │
│  - NestJS API 服务器                                        │
│  - 自动扩展 (0-N 实例)                                      │
│  - 健康检查和自动重启                                        │
└──────────────────────┬─────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  Supabase        │       │  AWS S3          │
│  (PostgreSQL)    │       │  (文件存储)       │
│  - 用户数据       │       │  - 上传的文件     │
│  - 会话历史       │       │  - OCR 结果       │
│  - OCR 元数据     │       └──────────────────┘
└──────────────────┘
         │
         ▼
┌──────────────────┐
│  Upstash Redis   │
│  (缓存层)         │
│  - 热数据缓存     │
│  - Rate Limiting │
└──────────────────┘
```

---

## 🚀 方案 A: Railway 全栈部署 (推荐初学者)

### 优势
- ✅ **一站式部署**: 数据库 + API + 定时任务全部在一个平台
- ✅ **自动 CI/CD**: 连接 GitHub 后每次 push 自动部署
- ✅ **免费开发额度**: $5/月 免费额度
- ✅ **配置简单**: 无需编写 Dockerfile

### 定价
- Hobby: $5 额度/月 (开发测试足够)
- Team: $20/月起 (生产环境)

### 部署步骤

#### Step 1: 准备 GitHub 仓库

```bash
# 1. 初始化 Git (如果还没有)
git init
git add .
git commit -m "Initial commit"

# 2. 推送到 GitHub
git remote add origin https://github.com/YOUR_USERNAME/study-oasis.git
git push -u origin main
```

#### Step 2: 配置 Railway 项目

1. 访问 https://railway.app
2. 使用 GitHub 登录
3. 点击 "New Project" → "Deploy from GitHub repo"
4. 选择你的仓库 `study-oasis`
5. Railway 会自动检测到 Monorepo 结构

#### Step 3: 配置服务

**3.1 创建 PostgreSQL 数据库**
```
New → Database → Add PostgreSQL
```
Railway 会自动生成:
- `DATABASE_URL`: 连接字符串
- 自动备份和监控

**3.2 部署后端 API**
```
New → GitHub Repo → study-oasis
Root Directory: apps/api
Build Command: pnpm install && pnpm run build
Start Command: node dist/main.js
```

**环境变量** (在 Railway Variables 中添加):
```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=${{Postgres.DATABASE_URL}}  # 自动引用
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=study-oasis-uploads
DEEPSEEK_API_KEY=your_deepseek_key
GOOGLE_CLOUD_KEY_PATH=/app/google-credentials.json
```

**3.3 添加 Prisma 迁移**

Railway 会自动运行 `pnpm run build`，我们需要在构建后执行迁移:

```json
// apps/api/package.json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main",
    "railway:deploy": "prisma migrate deploy && pnpm run start:prod"
  }
}
```

在 Railway 设置:
```
Start Command: pnpm run railway:deploy
```

#### Step 4: 部署前端

**选项 A: Vercel 部署前端 (推荐)**

1. 访问 https://vercel.com
2. 导入 GitHub 仓库
3. 配置:
   ```
   Framework Preset: Next.js
   Root Directory: apps/web
   Build Command: cd ../.. && pnpm install && cd apps/web && pnpm run build
   Output Directory: .next
   ```
4. 环境变量:
   ```bash
   NEXT_PUBLIC_API_URL=https://your-api.railway.app
   ```

**选项 B: Railway 部署前端**
```
New → GitHub Repo → study-oasis
Root Directory: apps/web
Build Command: pnpm install && pnpm run build
Start Command: pnpm run start
```

#### Step 5: 配置自定义域名 (可选)

**Railway**:
```
Settings → Networking → Generate Domain
或添加自定义域名: api.yourdomain.com
```

**Vercel**:
```
Settings → Domains → Add
yourdomain.com
```

#### Step 6: 设置 CORS

更新后端允许的域名:
```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: [
    'http://localhost:3000',
    'https://yourdomain.com',
    'https://your-vercel-app.vercel.app',
  ],
  credentials: true,
});
```

---

## 🚀 方案 B: Fly.io 部署 (更高性能)

### 优势
- ✅ **全球边缘网络**: 自动部署到离用户最近的节点
- ✅ **更快响应速度**: 平均延迟 <50ms
- ✅ **免费额度**: 3 个共享 CPU VM 免费

### 部署步骤

#### Step 1: 安装 Fly CLI

```bash
# macOS
brew install flyctl

# 登录
flyctl auth login
```

#### Step 2: 初始化后端

```bash
cd apps/api

# 初始化 Fly 配置
flyctl launch

# 选项:
# - App name: study-oasis-api
# - Region: 选择离用户最近的（美西 sjc / 香港 hkg）
# - PostgreSQL: Yes (会创建一个 Postgres 实例)
# - Redis: Yes (可选，用于缓存)
```

自动生成 `fly.toml`:
```toml
app = "study-oasis-api"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
```

#### Step 3: 创建 Dockerfile

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN pnpm run prisma:generate

# 构建
RUN pnpm --filter @study-oasis/api run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/package.json ./

EXPOSE 8080

CMD ["node", "dist/main.js"]
```

#### Step 4: 设置环境变量

```bash
# 设置 secrets
flyctl secrets set DATABASE_URL="postgresql://..."
flyctl secrets set AWS_ACCESS_KEY_ID="..."
flyctl secrets set AWS_SECRET_ACCESS_KEY="..."
flyctl secrets set DEEPSEEK_API_KEY="..."
```

#### Step 5: 部署

```bash
# 部署
flyctl deploy

# 查看状态
flyctl status

# 查看日志
flyctl logs

# 打开应用
flyctl open
```

---

## 🚀 方案 C: AWS / Vercel 完整方案 (企业级)

### 架构
```
Vercel (前端) → AWS API Gateway → AWS Lambda (API) → RDS + S3
```

### 成本预估
- Vercel: $20/月 (Pro)
- AWS Lambda: $0-5/月 (100万请求免费)
- RDS: $15-30/月 (db.t3.micro)
- S3: $1-5/月
- **总计**: ~$40-60/月

### 部署步骤 (简要)

1. **Lambda 部署**
   ```bash
   npm install -g serverless
   serverless deploy
   ```

2. **RDS 数据库**
   - 创建 PostgreSQL 实例
   - 配置安全组

3. **API Gateway**
   - 配置路由
   - 启用 CORS

---

## 📊 方案对比总结

| 方案 | 适合场景 | 月度成本 | 部署难度 | 性能 |
|------|---------|---------|---------|------|
| **Railway** | MVP、快速原型 | $0-20 | ⭐ | ⭐⭐⭐ |
| **Fly.io** | 全球化产品 | $0-30 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **AWS** | 企业级、高负载 | $40-100 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **自建 VPS** | 预算有限 | $5-10 | ⭐⭐⭐⭐ | ⭐⭐ |

---

## 💰 总成本预估 (1000 活跃用户)

### 方案 A: Railway + Vercel (推荐)
| 服务 | 月费 |
|------|------|
| Railway (API + DB) | $20 |
| Vercel (前端) | $0 (免费版) |
| AWS S3 (文件存储) | $2 |
| Supabase (数据库) | $0 (免费版) |
| DeepSeek API (AI) | $10 |
| **总计** | **$32/月** |

### 方案 B: Fly.io + Vercel
| 服务 | 月费 |
|------|------|
| Fly.io (API) | $0 (免费额度) |
| Vercel (前端) | $0 |
| Supabase | $0 |
| AWS S3 | $2 |
| DeepSeek API | $10 |
| **总计** | **$12/月** |

---

## 🔍 监控和运维

### 1. 日志监控

**Railway**: 内置日志查看器
```bash
# 实时日志
railway logs
```

**Fly.io**: Fly Logs
```bash
flyctl logs
```

### 2. 性能监控

推荐工具:
- **Sentry**: 错误追踪 (免费 5000 events/月)
- **LogRocket**: 用户会话重放
- **DataDog**: APM 性能监控

```typescript
// apps/api/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 3. 健康检查

```typescript
// apps/api/src/health/health.controller.ts
@Get()
async check() {
  return {
    status: 'ok',
    timestamp: Date.now(),
    database: await this.checkDatabase(),
    storage: await this.checkS3(),
  };
}
```

### 4. 告警设置

**Railway / Fly.io**:
- CPU > 80%
- 内存 > 90%
- 响应时间 > 2s
- 错误率 > 5%

---

## 🧪 部署前检查清单

- [ ] 所有环境变量已配置
- [ ] 数据库迁移已运行
- [ ] CORS 配置正确
- [ ] 文件上传到 S3 测试通过
- [ ] API 健康检查返回 200
- [ ] 前端可以访问后端 API
- [ ] HTTPS 证书正常
- [ ] 日志正常输出
- [ ] 错误监控已配置
- [ ] 备份策略已设置

---

## 📚 参考资料

- [Railway 文档](https://docs.railway.app)
- [Fly.io 文档](https://fly.io/docs)
- [Vercel 文档](https://vercel.com/docs)
- [NestJS 部署指南](https://docs.nestjs.com/faq/deployment)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)

---

## 🎯 推荐路径

1. **第 1 周**: Railway + Vercel (快速上线 MVP)
2. **第 2-4 周**: 收集用户反馈，优化功能
3. **1000+ 用户**: 迁移到 Fly.io (更好的性能)
4. **10000+ 用户**: 考虑 AWS (企业级架构)
