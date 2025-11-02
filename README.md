# Study Oasis - AI-Powered Learning Platform

> 一个基于 Next.js + NestJS 的 AI 学习平台，支持文档上传、OCR 识别、智能对话和数据分析。

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.18-2D3748)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/tests-91%2F104%20passing-yellow)](./TESTING_TODO.md)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 🚨 重要通知：Phase 3.5 代码质量修复（必须优先完成）

**当前状态**: Phase 3 完成 90%，但存在 **13 个失败测试** 和代码质量问题  
**必须行动**: 在开始新功能开发前，先完成 [Phase 3.5 代码质量修复](./PHASE_3.5_EXECUTION_SUMMARY.md)

### 为什么必须优先修复？
- ⚠️ **13 个失败测试** → 阻塞 CI/CD 流程
- 🔒 **安全隐患** → `google-cloud-key.json` 可能暴露
- 📚 **文档混乱** → 40+ 个文件散落根目录
- 📦 **类型重复** → 影响维护性
- 🧩 **大型组件** → 321 行难以维护

### 快速开始修复
```bash
# 1. 查看详细计划
cat PHASE_3.5_EXECUTION_SUMMARY.md

# 2. 开始修复测试（Day 1）
cd apps/api
pnpm test

# 3. 查看完整路线图
cat DEVELOPMENT_EXECUTION_PLAN.md
```

**预计时间**: 3-5 天 | **目标**: 代码质量 7.2/10 → 8.5/10

---

## ✨ 特性

### 核心功能
- 📤 **文件上传**: 支持 PDF/Word/图片等多种格式
- 🔍 **OCR 识别**: Google Cloud Vision API，98-99% 准确率
- 💬 **AI 对话**: DeepSeek v3 驱动的智能对话系统
- 🌊 **流式输出**: 实时逐字显示 AI 回复，思考状态提示 🆕
- 📊 **数据分析**: 完整的用户行为追踪和成本监控
- ☁️ **云原生**: Google Cloud Storage + Supabase PostgreSQL

### 技术亮点
- 🎯 **Monorepo 架构**: 前后端统一管理（pnpm workspace）
- 🔐 **类型安全**: 全栈 TypeScript + Prisma ORM
- 📈 **实时分析**: 40+ 种事件埋点，实时统计
- 🚀 **生产就绪**: 完整的错误处理、日志记录、监控
- 💰 **成本追踪**: 自动计算 OCR 和 AI API 使用成本
- ♻️ **组件化架构**: 模块化设计，80% 代码行数优化

### 代码质量
- ✅ **测试覆盖率**: 78% (后端), 目标 80%
- ✅ **组件测试**: 34+ 前端组件测试
- ✅ **代码优化**: 主要页面从 838 行减少到 171 行 (-80%)
- ✅ **文档完善**: 完整的 API 和组件文档

---

## 🏗️ 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户浏览器                              │
│          Next.js 14 + React + Tailwind CSS                   │
│          (Vercel, 免费托管)                                  │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────┴────────────────────────────────────────┐
│                  NestJS API Server                           │
│         (Railway, $20/月)                                    │
│  ┌──────────────┬──────────────┬──────────────────────┐   │
│  │  Upload      │  Chat        │  Analytics           │   │
│  │  Module      │  Module      │  Module (埋点)       │   │
│  └──────┬───────┴──────┬───────┴──────────┬───────────┘   │
│         │              │                  │                 │
└─────────┼──────────────┼──────────────────┼─────────────────┘
          │              │                  │
          ▼              ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌────────────────────┐
│ Google Cloud    │ │  DeepSeek    │ │  Supabase          │
│ Storage + Vision│ │  v3 API      │ │  PostgreSQL        │
│ ($0-15/月)      │ │  ($10/月)    │ │  ($0-25/月)        │
└─────────────────┘ └──────────────┘ └────────────────────┘
```

---

## 🚀 快速开始

### 前置要求

- Node.js >= 20
- pnpm >= 9
- PostgreSQL 数据库（推荐 Supabase）
- Google Cloud 账号（Vision API + Storage）
- DeepSeek API Key (可选)

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/study-oasis.git
cd study-oasis
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置数据库

#### 3.1 创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com)
2. 创建新项目
3. 获取 `DATABASE_URL` (Connection string)

#### 3.2 运行数据库迁移

```bash
cd apps/api

# 配置环境变量
export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# 生成 Prisma Client
npx prisma generate

# 运行迁移（创建 8 个表）
npx prisma migrate dev --name init

# 验证表创建（可选）
npx prisma studio
```

### 4. 配置 Google Cloud

#### 4.1 创建项目并启用 API

```bash
# 创建项目
gcloud projects create study-oasis --name="Study Oasis"

# 设置当前项目
gcloud config set project study-oasis

# 启用 Vision API 和 Storage API
gcloud services enable vision.googleapis.com storage.googleapis.com
```

#### 4.2 创建服务账号

```bash
# 创建服务账号
gcloud iam service-accounts create study-oasis-api \
  --display-name="Study Oasis API Service Account"

# 授权角色
gcloud projects add-iam-policy-binding study-oasis \
  --member="serviceAccount:study-oasis-api@study-oasis.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding study-oasis \
  --member="serviceAccount:study-oasis-api@study-oasis.iam.gserviceaccount.com" \
  --role="roles/cloudvision.serviceAgent"

# 下载密钥
gcloud iam service-accounts keys create google-credentials.json \
  --iam-account=study-oasis-api@study-oasis.iam.gserviceaccount.com
```

#### 4.3 创建 GCS 存储桶

```bash
gsutil mb -p study-oasis -c STANDARD -l US gs://study-oasis-uploads
```

### 5. 配置环境变量

```bash
# 后端配置
cd apps/api
cp .env.example .env

# 编辑 apps/api/.env，填入以下值：
DATABASE_URL="postgresql://..." # 从 Supabase 复制
GOOGLE_CLOUD_PROJECT_ID="study-oasis"
GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json" # 密钥文件路径
GCS_BUCKET_NAME="study-oasis-uploads"
DEEPSEEK_API_KEY="your-deepseek-key"

# 前端配置
cd ../web
cp .env.example .env

# 编辑 apps/web/.env：
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-XXXXXXXXXX" # Google Analytics (可选)
```

### 6. 启动开发服务器

```bash
# 启动后端（端口 4000）
cd apps/api
pnpm run start:dev

# 新终端，启动前端（端口 3000）
cd apps/web
pnpm run dev
```

### 7. 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:4000
- **API 文档**: http://localhost:4000/api-docs
- **Health Check**: http://localhost:4000/health
- **Analytics 概览**: http://localhost:4000/analytics/overview

---

## 📦 项目结构

```
study-oasis/
├── apps/
│   ├── api/                    # NestJS 后端
│   │   ├── src/
│   │   │   ├── analytics/      # 数据埋点和统计
│   │   │   ├── chat/           # AI 对话服务
│   │   │   ├── ocr/            # OCR 服务
│   │   │   ├── prisma/         # 数据库服务
│   │   │   ├── storage/        # 云存储服务
│   │   │   ├── upload/         # 文件上传
│   │   │   └── ...
│   │   ├── prisma/
│   │   │   └── schema.prisma   # 数据库 Schema (8 表)
│   │   └── test/               # E2E 测试
│   │
│   └── web/                    # Next.js 前端
│       ├── app/
│       │   ├── chat/           # 对话页面
│       │   ├── upload/         # 上传页面
│       │   └── settings/       # 设置页面
│       └── lib/
│           ├── storage.ts      # localStorage 管理
│           └── api-client.ts   # API 客户端
│
├── packages/
│   └── contracts/              # 共享类型定义
│
├── docs/                       # 项目文档
│   ├── QUICK_START_GUIDE.md
│   ├── ANALYTICS_AND_TRACKING_GUIDE.md
│   ├── GOOGLE_CLOUD_ARCHITECTURE.md
│   └── PHASE_3_IMPLEMENTATION_REPORT.md
│
└── pnpm-workspace.yaml         # Monorepo 配置
```

---

## 🗄️ 数据库 Schema

### 核心表

1. **users** - 用户信息
2. **documents** - 文档元信息（支持 GCS/S3 双存储）
3. **ocr_results** - OCR 识别结果
4. **conversations** - 对话历史
5. **messages** - 消息记录

### 埋点表

6. **analytics_events** - 用户行为事件（40+ 种事件类型）
7. **api_usage_logs** - API 调用日志
8. **user_daily_stats** - 用户每日统计

查看完整 Schema: [prisma/schema.prisma](./apps/api/prisma/schema.prisma)

---

## 📊 数据分析 API

### 可用端点

```bash
# 活跃用户数
GET /analytics/active-users?minutes=30

# 事件统计
GET /analytics/event-stats?days=7

# API 统计
GET /analytics/api-stats?hours=24

# 成本估算
GET /analytics/cost

# 热门功能
GET /analytics/top-features?limit=10

# 用户留存率
GET /analytics/retention?days=7

# 综合概览
GET /analytics/overview
```

### 示例响应

```json
{
  "timestamp": "2025-11-01T10:30:00Z",
  "activeUsers": {
    "count": 42,
    "timeRange": "30 minutes"
  },
  "api": {
    "errorRate": "1.5%",
    "averageResponseTime": "250.5ms"
  },
  "cost": {
    "ocr": "$2.50",
    "ai": "$1.75",
    "total": "$4.25",
    "month": "2025-11"
  },
  "topFeatures": [
    { "feature": "file_upload_success", "usageCount": 1250 },
    { "feature": "chat_message_sent", "usageCount": 980 }
  ]
}
```

详细文档: [ANALYTICS_AND_TRACKING_GUIDE.md](./ANALYTICS_AND_TRACKING_GUIDE.md)

---

## 🧪 测试

```bash
# 单元测试
cd apps/api
pnpm test

# 测试覆盖率
pnpm test:cov

# E2E 测试
pnpm test:e2e

# 前端测试
cd apps/web
pnpm test
```

---

## 🚀 部署

### 选项 A: Railway + Vercel（推荐）

#### 1. 后端部署到 Railway

```bash
# 连接 GitHub 仓库
railway link

# 配置环境变量（在 Railway Dashboard）
railway variables set DATABASE_URL="postgresql://..."
railway variables set GOOGLE_CREDENTIALS_BASE64="$(base64 < google-credentials.json)"
railway variables set DEEPSEEK_API_KEY="your-key"

# 部署
git push origin main
```

#### 2. 前端部署到 Vercel

```bash
cd apps/web

# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod

# 配置环境变量
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_GA_MEASUREMENT_ID production
```

详细指南: [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)

---

## 💰 成本估算

| 服务 | 免费额度 | 成本（1000 用户/月） |
|------|---------|---------------------|
| **Vercel** (前端) | 100GB 流量 | $0 |
| **Railway** (后端) | $5 试用 | $20 |
| **Supabase** (数据库) | 500MB | $0-25 |
| **Google Vision API** | 前 1000 页 | $0-15 |
| **Google Cloud Storage** | 5GB | $0-2 |
| **DeepSeek API** | 按量计费 | $10 |
| **总计** | - | **$30-72/月** |

开发阶段（100 用户）: **$1-5/月**

---

## 📖 文档

### 快速入门
- [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) - 5 步 30 分钟部署指南

### 技术架构
- [GOOGLE_CLOUD_ARCHITECTURE.md](./GOOGLE_CLOUD_ARCHITECTURE.md) - Google Cloud 架构设计
- [CLOUD_SERVICES_COMPARISON.md](./CLOUD_SERVICES_COMPARISON.md) - 5 种云方案对比
- [FRONTEND_REFACTORING.md](./docs/FRONTEND_REFACTORING.md) - 前端组件重构文档 🆕
- [TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) - 测试运行和编写指南 🆕

### 功能指南
- [ANALYTICS_AND_TRACKING_GUIDE.md](./ANALYTICS_AND_TRACKING_GUIDE.md) - 数据埋点完整实现
- [UI_DEVELOPMENT_PLAN.md](./UI_DEVELOPMENT_PLAN.md) - 前端功能规划

### 实施报告
- [PHASE_3_IMPLEMENTATION_REPORT.md](./PHASE_3_IMPLEMENTATION_REPORT.md) - Phase 3 实施详情
- [DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md) - 开发日志

---

## 🛠️ 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **UI**: React 18, Tailwind CSS
- **状态管理**: localStorage + Context API
- **分析**: Google Analytics 4

### 后端
- **框架**: NestJS 11
- **数据库**: PostgreSQL (Prisma ORM)
- **文件存储**: Google Cloud Storage
- **OCR**: Google Cloud Vision API
- **AI**: DeepSeek v3 API
- **日志**: Winston

### 开发工具
- **包管理**: pnpm (Monorepo)
- **类型检查**: TypeScript 5.9
- **代码规范**: ESLint, Prettier
- **测试**: Jest, Supertest
- **API 文档**: Swagger

---

## 🤝 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)（待创建）

---

## 📝 License

MIT © [Your Name]

---

## 📧 联系方式

- GitHub Issues: [创建 Issue](https://github.com/yourusername/study-oasis/issues)
- Email: your.email@example.com

---

## 🎯 路线图

### Phase 1 ✅
- [x] 基础前后端架构
- [x] 文件上传（本地存储）
- [x] AI 对话（硬编码）

### Phase 2 ✅ (已完成)
- [x] 状态持久化（localStorage）
- [x] Swagger API 文档
- [x] 测试覆盖 > 90%
- [x] **SSE 流式输出** 🆕
  - ✅ 使用 requestAnimationFrame 实现逐字流式渲染
  - ✅ AI 思考状态提示（🧠 蓝色动画）
  - ✅ 突破 React 18 自动批处理限制
  - ✅ 对话上下文管理（conversationId）
  - ✅ 流式内容独立状态管理

详细文档: [Phase 2 SSE 流式输出完成报告](./docs/implementation/PHASE_2_SSE_STREAMING_COMPLETE.md)

### Phase 3 ✅ (已完成)
- [x] Prisma + PostgreSQL 集成
- [x] Google Cloud Storage 集成
- [x] Google Vision OCR 集成
- [x] 数据埋点和分析
- [x] 前端组件重构（-80% 代码行数）🆕
- [x] 组件测试覆盖 🆕
- [x] 后端测试覆盖率 78% 🆕

### Phase 4 📅 (计划中)
- [ ] 测试覆盖率提升到 90%
- [ ] E2E 测试（Playwright）
- [ ] 用户认证（Supabase Auth）
- [ ] 权限管理
- [ ] 支付系统
- [ ] 移动端适配

---

**Star ⭐ this repo if you find it useful!**
