# Railway + Supabase + Google Vision OCR 快速开始指南

## 🎯 推荐方案总结

**为什么选择这个组合？**

| 优势 | 说明 |
|------|------|
| ✅ **最简单** | 30 分钟即可上线 |
| ✅ **成本最低** | 开发阶段几乎 $0，生产环境 $55-61/月 |
| ✅ **OCR 最好** | Google Vision 准确率 98-99% |
| ✅ **扩展性强** | 自动扩展，支持 0-10000 用户 |
| ✅ **数据分析完善** | 内置埋点 + GA4 + Supabase 查询 |

---

## 📋 完整技术栈

```
┌─────────────────────────────────────────────────────────┐
│                   技术栈全览                             │
├─────────────────────────────────────────────────────────┤
│ 前端: Next.js 14 + React + TypeScript + Tailwind CSS   │
│ 托管: Vercel (免费)                                     │
│ 分析: Google Analytics 4 (免费)                        │
├─────────────────────────────────────────────────────────┤
│ 后端: NestJS + TypeScript                              │
│ 托管: Railway ($20/月)                                 │
│ 日志: Winston + 自定义埋点                             │
├─────────────────────────────────────────────────────────┤
│ 数据库: PostgreSQL (Supabase, $0-25/月)               │
│ ORM: Prisma                                            │
│ 分析: Supabase Dashboard + SQL 查询                   │
├─────────────────────────────────────────────────────────┤
│ 文件存储: AWS S3 / Supabase Storage ($0-2/月)         │
│ OCR: Google Cloud Vision API ($0-15/月)               │
│ AI: DeepSeek v3 API ($10/月)                          │
└─────────────────────────────────────────────────────────┘

总成本: $0-61/月（1000 活跃用户）
```

---

## 🚀 5 步快速部署

### Step 1: 创建 Supabase 数据库 (5 分钟)

1. 访问 https://supabase.com
2. 点击 "New Project"
3. 填写信息:
   - Name: `study-oasis`
   - Database Password: 设置强密码（保存好！）
   - Region: 选择离用户最近的区域
4. 等待初始化（~2 分钟）
5. 获取连接字符串:
   - 左侧菜单 → Settings → Database
   - 复制 `Connection string` (URI)
   - 格式: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

**保存环境变量**:
```bash
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"
```

---

### Step 2: 配置 Google Cloud Vision API (10 分钟)

#### 2.1 创建 Google Cloud 项目

1. 访问 https://console.cloud.google.com
2. 点击顶部项目下拉框 → "New Project"
3. 项目名称: `study-oasis`
4. 点击 "Create"

#### 2.2 启用 Vision API

```bash
# 如果已安装 gcloud CLI
gcloud services enable vision.googleapis.com

# 或在网页操作:
# 访问 https://console.cloud.google.com/apis/library/vision.googleapis.com
# 点击 "Enable"
```

#### 2.3 创建服务账号

1. 导航: IAM & Admin → Service Accounts
2. 点击 "Create Service Account"
3. 填写:
   - Name: `study-oasis-api`
   - Description: `API server access`
4. 点击 "Create and Continue"
5. 授权角色: `Cloud Vision AI Service Agent`
6. 点击 "Done"

#### 2.4 创建密钥

1. 点击刚创建的服务账号
2. 切换到 "Keys" 标签
3. 点击 "Add Key" → "Create new key"
4. 选择 "JSON"
5. 下载密钥文件（保存为 `google-credentials.json`）

**保存环境变量**:
```bash
# Railway 部署时上传文件，本地开发用绝对路径
GOOGLE_APPLICATION_CREDENTIALS=/path/to/google-credentials.json
```

---

### Step 3: 部署后端到 Railway (10 分钟)

#### 3.1 准备代码

确保你的仓库已推送到 GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 3.2 连接 Railway

1. 访问 https://railway.app
2. 使用 GitHub 登录
3. 点击 "New Project"
4. 选择 "Deploy from GitHub repo"
5. 选择你的仓库: `study-oasis`
6. Railway 自动检测到 Monorepo

#### 3.3 配置后端服务

1. 点击 "New Service" → "GitHub Repo"
2. 配置:
   - **Root Directory**: `apps/api`
   - **Build Command**: `pnpm install && pnpm run build`
   - **Start Command**: `pnpm run start:prod`

#### 3.4 设置环境变量

在 Railway 项目中点击 "Variables"，添加:

```bash
NODE_ENV=production
PORT=4000

# 数据库（从 Supabase 复制）
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres

# Google Vision API（上传 JSON 密钥）
GOOGLE_APPLICATION_CREDENTIALS=/app/google-credentials.json

# DeepSeek API
DEEPSEEK_API_KEY=your_deepseek_key

# AWS S3（如果使用）
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=study-oasis-uploads

# CORS 配置
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

#### 3.5 上传 Google 密钥文件

Railway 暂不支持直接上传文件，需要转换为 Base64:

```bash
# 本地执行
base64 google-credentials.json > google-credentials.base64

# 在 Railway Variables 添加
GOOGLE_CREDENTIALS_BASE64=<base64 内容>
```

然后在代码中解码:
```typescript
// apps/api/src/main.ts
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  const credentials = Buffer.from(
    process.env.GOOGLE_CREDENTIALS_BASE64,
    'base64'
  ).toString('utf-8');
  
  fs.writeFileSync('/tmp/google-credentials.json', credentials);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = '/tmp/google-credentials.json';
}
```

#### 3.6 部署

Railway 会自动部署，等待完成（约 3-5 分钟）。

部署成功后，获取 API URL:
- Railway Dashboard → Settings → Domains
- 复制 URL: `https://your-app.railway.app`

---

### Step 4: 部署前端到 Vercel (5 分钟)

#### 4.1 连接 Vercel

1. 访问 https://vercel.com
2. 使用 GitHub 登录
3. 点击 "New Project"
4. 导入你的 GitHub 仓库

#### 4.2 配置构建

Vercel 自动检测 Next.js，但需要配置 Monorepo:

- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && pnpm install && cd apps/web && pnpm run build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install`

#### 4.3 设置环境变量

```bash
# Railway API URL
NEXT_PUBLIC_API_URL=https://your-app.railway.app

# Google Analytics 4
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# PostHog (可选)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

#### 4.4 部署

点击 "Deploy"，等待完成（约 2-3 分钟）。

部署成功后，获取前端 URL:
- 复制 Vercel 生成的域名: `https://your-app.vercel.app`

---

### Step 5: 配置数据库表 (10 分钟)

#### 5.1 安装 Prisma

```bash
cd apps/api
pnpm add prisma @prisma/client
pnpm add -D @prisma/cli
```

#### 5.2 初始化 Prisma

```bash
npx prisma init
```

#### 5.3 配置 schema.prisma

复制以下内容到 `apps/api/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  email     String?  @unique
  createdAt DateTime @default(now())
  
  documents     Document[]
  conversations Conversation[]
  
  @@map("users")
}

model Document {
  id          String   @id @default(uuid())
  userId      String?
  filename    String
  s3Key       String?   // AWS S3 路径
  gcsPath     String?   // Google Cloud Storage 路径
  mimeType    String
  size        Int
  uploadedAt  DateTime @default(now())
  
  user          User?         @relation(fields: [userId], references: [id])
  ocrResult     OcrResult?
  conversations Conversation[]
  
  @@index([userId])
  @@map("documents")
}

model OcrResult {
  id             String   @id @default(uuid())
  documentId     String   @unique
  fullText       String   @db.Text
  structuredData Json
  language       String
  confidence     Float
  pageCount      Int?
  extractedAt    DateTime @default(now())
  
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  @@map("ocr_results")
}

model Conversation {
  id         String   @id @default(uuid())
  userId     String?
  documentId String?
  title      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  user     User?     @relation(fields: [userId], references: [id])
  document Document? @relation(fields: [documentId], references: [id])
  messages Message[]
  
  @@index([userId])
  @@index([documentId])
  @@map("conversations")
}

model Message {
  id             String   @id @default(uuid())
  conversationId String
  role           String   // 'user' | 'assistant' | 'system'
  content        String   @db.Text
  hintLevel      Int?
  modelUsed      String?  // 'deepseek-chat'
  tokensUsed     Int?
  timestamp      DateTime @default(now())
  
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
  @@map("messages")
}

// 数据埋点表
model AnalyticsEvent {
  id              String   @id @default(uuid())
  userId          String?
  sessionId       String
  eventName       String
  eventCategory   String
  eventProperties Json     @default("{}")
  pageUrl         String?
  referrer        String?
  userAgent       String?
  deviceType      String?
  browser         String?
  os              String?
  createdAt       DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([eventName, createdAt])
  @@index([sessionId, createdAt])
  @@map("analytics_events")
}

model ApiUsageLog {
  id                  String   @id @default(uuid())
  userId              String?
  endpoint            String
  method              String
  statusCode          Int
  responseTimeMs      Int?
  requestSizeBytes    Int?
  responseSizeBytes   Int?
  externalApiCalls    Json     @default("{}")
  errorMessage        String?
  errorStack          String?  @db.Text
  createdAt           DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([endpoint, createdAt])
  @@map("api_usage_logs")
}

model UserDailyStat {
  id                    String   @id @default(uuid())
  userId                String?
  date                  DateTime @db.Date
  filesUploaded         Int      @default(0)
  ocrPagesProcessed     Int      @default(0)
  chatMessagesSent      Int      @default(0)
  chatSessions          Int      @default(0)
  apiRequestsTotal      Int      @default(0)
  apiRequestsSuccess    Int      @default(0)
  apiRequestsFailed     Int      @default(0)
  googleVisionCost      Decimal  @default(0) @db.Decimal(10, 4)
  deepseekCost          Decimal  @default(0) @db.Decimal(10, 4)
  storageCost           Decimal  @default(0) @db.Decimal(10, 4)
  totalCost             Decimal  @default(0) @db.Decimal(10, 4)
  activeTimeMinutes     Int      @default(0)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  @@unique([userId, date])
  @@index([userId, date])
  @@map("user_daily_stats")
}
```

#### 5.4 运行迁移

```bash
# 设置数据库连接字符串
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres"

# 创建迁移
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate
```

#### 5.5 验证数据库

```bash
# 打开 Prisma Studio（可视化数据库管理工具）
npx prisma studio
```

或在 Supabase Dashboard:
- 左侧菜单 → Table Editor
- 查看是否成功创建表

---

## ✅ 验证部署

### 1. 测试后端 API

```bash
# 健康检查
curl https://your-app.railway.app/health

# 预期返回:
# {"status":"ok","database":"connected","timestamp":...}
```

### 2. 测试前端

访问: `https://your-app.vercel.app`

- ✅ 页面正常加载
- ✅ 可以上传文件
- ✅ 可以与 AI 对话

### 3. 测试 Google Vision OCR

上传一个 PDF 或图片文件，在浏览器控制台查看:

```javascript
// 应该可以看到 OCR 结果
console.log('OCR result:', ocrResult);
```

### 4. 查看埋点数据

在 Supabase Dashboard:
1. 左侧菜单 → Table Editor
2. 选择 `analytics_events` 表
3. 应该可以看到页面浏览、文件上传等事件

---

## 📊 数据分析配置

### Google Analytics 4

1. 访问 https://analytics.google.com
2. 创建账号和媒体资源
3. 获取 Measurement ID: `G-XXXXXXXXXX`
4. 在 Vercel 环境变量中设置:
   ```
   NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```
5. 重新部署前端

### Supabase 查询

在 Supabase SQL Editor 执行查询:

```sql
-- 今日活跃用户
SELECT COUNT(DISTINCT user_id) as active_users
FROM analytics_events
WHERE created_at >= CURRENT_DATE;

-- 最热门功能
SELECT event_name, COUNT(*) as count
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY event_name
ORDER BY count DESC
LIMIT 10;

-- OCR 成本统计
SELECT 
  COUNT(*) as ocr_count,
  CASE 
    WHEN COUNT(*) > 1000 THEN (COUNT(*) - 1000) * 1.5 / 1000
    ELSE 0
  END as estimated_cost_usd
FROM analytics_events
WHERE event_name = 'ocr_success'
  AND created_at >= DATE_TRUNC('month', NOW());
```

---

## 💰 成本监控

### 设置 Google Cloud 预算告警

```bash
gcloud billing budgets create \
  --billing-account=YOUR_BILLING_ACCOUNT_ID \
  --display-name="Study Oasis Monthly Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90 \
  --threshold-rule=percent=100
```

### 实时成本查询 API

访问: `https://your-app.railway.app/analytics/cost?days=30`

返回:
```json
{
  "googleVision": {
    "calls": 1500,
    "cost": "0.75"
  },
  "deepseek": {
    "tokens": 100000,
    "cost": "1.00"
  },
  "total": "1.75"
}
```

---

## 🔧 常见问题

### Q1: Railway 部署失败

**检查**:
- ✅ 确认 `apps/api/package.json` 有 `build` 和 `start:prod` 脚本
- ✅ 检查环境变量是否正确设置
- ✅ 查看 Railway Logs 错误信息

### Q2: Google Vision API 调用失败

**检查**:
- ✅ Vision API 是否已启用
- ✅ 服务账号密钥是否正确上传
- ✅ 环境变量 `GOOGLE_APPLICATION_CREDENTIALS` 路径是否正确

### Q3: Prisma 迁移失败

**检查**:
- ✅ `DATABASE_URL` 是否正确
- ✅ Supabase 数据库是否在线
- ✅ 网络连接是否正常

### Q4: 前端无法连接后端

**检查**:
- ✅ `NEXT_PUBLIC_API_URL` 是否设置为 Railway URL
- ✅ Railway API 是否设置 CORS 允许 Vercel 域名
- ✅ 浏览器控制台是否有 CORS 错误

---

## 📚 下一步

完成部署后，继续优化:

1. ✅ **集成用户认证** (Supabase Auth)
2. ✅ **添加自定义域名**
3. ✅ **配置 CI/CD 测试**
4. ✅ **设置监控告警** (Sentry)
5. ✅ **性能优化** (Redis 缓存)

---

## 🎯 相关文档

- 📄 **ANALYTICS_AND_TRACKING_GUIDE.md** - 数据埋点完整指南
- 📄 **GOOGLE_CLOUD_ARCHITECTURE.md** - Google Cloud 详细配置
- 📄 **CLOUD_SERVICES_COMPARISON.md** - 云服务方案对比
- 📄 **CLOUD_DATABASE_MIGRATION_PLAN.md** - Supabase 配置指南

---

需要帮助？在项目中创建 Issue 或查看文档！
