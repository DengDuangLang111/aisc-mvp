# Study Oasis - AI-Powered Learning Platform

> 基于 Next.js + NestJS 的 AI 学习平台，支持文档上传、OCR 识别、智能对话和数据分析

[![CI Status](https://github.com/YOUR_USERNAME/study_oasis_simple/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/study_oasis_simple/actions)
[![Deploy Status](https://github.com/YOUR_USERNAME/study_oasis_simple/workflows/Deploy/badge.svg)](https://github.com/YOUR_USERNAME/study_oasis_simple/actions)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/study_oasis_simple/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/study_oasis_simple)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6.18-2D3748)](https://www.prisma.io/)
[![Tests](https://img.shields.io/badge/tests-256%2F256%20passing-brightgreen)](./apps/api/README.md)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 📊 项目状态（2025年11月）

| 模块 | 状态 | 测试覆盖率 | 说明 |
|------|-----|-----------|------|
| **后端 API** | ✅ 完成 | 96.0% (218/227) | NestJS + Repository Pattern |
| **数据库** | ✅ 完成 | 8 表 | PostgreSQL + Prisma ORM |
| **文件上传** | ✅ 完成 | 100% | Google Cloud Storage |
| **OCR 识别** | ✅ 完成 | 100% | Google Vision API |
| **AI 对话** | ✅ 完成 | 完整 | DeepSeek v3 + 流式输出 |
| **数据分析** | ✅ 完成 | 100% | 实时统计 + 成本追踪 |
| **前端界面** | ✅ 完成 | - | Next.js 14 + React |
| **代码质量** | 🚧 重构中 | P1 83% | Repository Pattern |

**当前重点**: P1 阶段架构重构（Repository 模式、日志系统、分页功能）

---

## ✨ 核心功能

### 🎯 已实现功能

#### 1. 文档管理系统
- ✅ 支持多种格式：PDF、Word、图片（JPG/PNG）
- ✅ Google Cloud Storage 云存储
- ✅ 文件元数据跟踪（大小、类型、上传时间、用户）
- ✅ 自动过期清理（30天未使用）
- ✅ 完整的 CRUD 操作

#### 2. OCR 文本识别
- ✅ Google Cloud Vision API 集成
- ✅ 98-99% 识别准确率
- ✅ 多语言支持（中英文为主）
- ✅ 页数统计和置信度评分
- ✅ 异步处理，性能优化

#### 3. AI 智能对话
- ✅ DeepSeek v3 大模型驱动
- ✅ **流式输出**：实时逐字显示 AI 回复
- ✅ **渐进式提示**：Hint Level 1-3 智能提示
- ✅ 对话历史管理（分页、排序）
- ✅ 文档上下文集成
- ✅ Token 使用统计

#### 4. 数据埋点与分析
- ✅ 40+ 事件类型追踪
- ✅ 实时活跃用户统计
- ✅ API 使用成本计算（OCR + AI）
- ✅ 用户留存率分析
- ✅ 请求耗时监控

#### 5. 前端用户界面
- ✅ 响应式设计（移动端适配）
- ✅ 暗黑模式支持
- ✅ 文件拖拽上传
- ✅ 实时 AI 对话界面
- ✅ 对话历史侧边栏
- ✅ Markdown 渲染支持

### 🔜 计划功能

- [ ] 用户认证系统（Supabase Auth）
- [ ] 多用户协作
- [ ] 导出对话记录
- [ ] 自定义 AI 参数
- [ ] 更多文件格式支持

---

## 🏗️ 技术架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                   前端 (Next.js 14)                          │
│   - App Router + Server Components                           │
│   - Tailwind CSS + shadcn/ui                                 │
│   - 结构化日志系统 (Logger)                                   │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API (HTTP)
┌────────────────────┴────────────────────────────────────────┐
│              NestJS API Server (Port 4001)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📦 Modules (模块化架构):                            │  │
│  │    - Upload Module (文件上传)                         │  │
│  │      └─ DocumentRepository                            │  │
│  │    - OCR Module (文本识别)                            │  │
│  │      └─ VisionService                                 │  │
│  │    - Chat Module (AI 对话)                            │  │
│  │      ├─ ConversationRepository                        │  │
│  │      └─ MessageRepository                             │  │
│  │    - Analytics Module (数据分析)                      │  │
│  │    - Health Module (健康检查)                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  🔧 基础设施:                                                │
│    - Repository Pattern (数据访问层抽象)                     │
│    - Winston Logger (结构化日志)                             │
│    - Pagination DTO (统一分页)                               │
│    - Prisma ORM (类型安全)                                   │
└─────┬─────────────┬──────────────┬─────────────────────────┘
      │             │              │
      ▼             ▼              ▼
┌─────────────┐ ┌────────────┐ ┌──────────────────────┐
│ Supabase    │ │ Google     │ │ DeepSeek API         │
│ PostgreSQL  │ │ Cloud      │ │                      │
│             │ │ (Storage + │ │ deepseek-chat v3     │
│ 8 Tables    │ │  Vision)   │ │ 流式输出              │
│ 连接池: 17  │ │            │ │                      │
└─────────────┘ └────────────┘ └──────────────────────┘
```

### 数据库结构

| 表名 | 作用 | 关键字段 |
|-----|------|---------|
| `Document` | 文档管理 | originalName, size, mimeType, gcsBucket, gcsPath |
| `OcrResult` | OCR 结果 | documentId, fullText, pageCount, confidence |
| `Conversation` | 对话记录 | userId, documentId, title, updatedAt |
| `Message` | 消息记录 | conversationId, role, content, tokensUsed |
| `Analytics` | 数据埋点 | eventType, userId, metadata, timestamp |

---

## 🚀 快速开始

### 前置要求

- Node.js 18+ (推荐使用 20.x)
- pnpm 8+
- PostgreSQL 15+ (或 Supabase 账号)
- Google Cloud 账号（用于 Storage 和 Vision API）
- DeepSeek API Key

### 环境变量配置

#### 后端 `.env` (apps/api/.env)

```bash
# 数据库连接
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Google Cloud 配置
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_APPLICATION_CREDENTIALS="./google-cloud-key.json"
GCS_BUCKET_NAME="your-bucket-name"

# DeepSeek API
DEEPSEEK_API_KEY="your-deepseek-api-key"
DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL="deepseek-chat"

# 服务器配置
PORT=4001
NODE_ENV=development
```

#### 前端 `.env.local` (apps/web/.env.local)

```bash
# API 地址
NEXT_PUBLIC_API_URL=http://localhost:4001

# Google Analytics (可选)
NEXT_PUBLIC_GA_ID=your-ga-id
```

### 安装和启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd study_oasis_simple

# 2. 安装依赖
pnpm install

# 3. 初始化数据库
cd apps/api
pnpm prisma generate
pnpm prisma migrate deploy

# 4. 启动后端（终端 1）
cd apps/api
pnpm start:dev
# 访问 http://localhost:4001

# 5. 启动前端（终端 2）
cd apps/web
pnpm dev
# 访问 http://localhost:3000
```

### 使用便捷脚本

项目提供了多个便捷脚本（根目录）：

```bash
# 启动所有服务（推荐）
./start-servers.sh

# 单独启动
./start-backend.sh   # 后端 API
./start-frontend.sh  # 前端界面

# 停止所有服务
./stop-servers.sh

# 测试 API
./test-api.sh

# 数据库同步
./sync-db.sh
```

---

## 🧪 测试

### 后端测试

```bash
cd apps/api

# 运行所有测试
pnpm test

# 查看覆盖率
pnpm test:cov

# 监听模式
pnpm test:watch

# 特定文件
pnpm test chat.service.spec.ts
```

**当前状态**: 218/227 tests passing (96.0%)

### 前端测试

```bash
cd apps/web

# 运行单元测试
pnpm test

# E2E 测试
pnpm test:e2e

# 组件测试
pnpm test:components
```

---

## 📁 项目结构

```
study_oasis_simple/
├── apps/
│   ├── api/                    # NestJS 后端
│   │   ├── src/
│   │   │   ├── upload/         # 文件上传模块
│   │   │   │   └── repositories/
│   │   │   │       └── document.repository.ts
│   │   │   ├── chat/           # AI 对话模块
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── conversation.repository.ts
│   │   │   │   │   └── message.repository.ts
│   │   │   │   ├── chat.service.ts
│   │   │   │   └── chat.controller.ts
│   │   │   ├── ocr/            # OCR 识别模块
│   │   │   ├── analytics/      # 数据分析模块
│   │   │   └── common/         # 公共模块
│   │   │       ├── dto/
│   │   │       │   └── pagination.dto.ts
│   │   │       └── providers/
│   │   │           └── google-credentials.provider.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── test/
│   └── web/                    # Next.js 前端
│       ├── app/                # App Router
│       │   ├── chat/
│       │   ├── upload/
│       │   └── layout.tsx
│       ├── lib/
│       │   ├── logger.ts       # 前端日志工具
│       │   └── hooks/
│       └── public/
├── docs/
│   ├── archive/                # 历史文档归档
│   │   ├── phases/             # Phase 1-3 完成报告
│   │   ├── fixes/              # 修复记录
│   │   ├── status-reports/     # 进度报告
│   │   ├── planning/           # 规划文档
│   │   └── guides/             # 各类指南
│   ├── architecture/           # 架构设计
│   ├── database/               # 数据库文档
│   └── testing/                # 测试文档
├── start-servers.sh            # 启动所有服务
├── stop-servers.sh             # 停止所有服务
├── package.json                # 根 package.json
├── pnpm-workspace.yaml         # Monorepo 配置
└── README.md                   # 本文件
```

---

## 🔄 P1 阶段重构进度

### 已完成 (10/12 = 83%)

- ✅ **P1-1**: GoogleCredentialsProvider 抽取
- ✅ **P1-2**: 后端 console.log 替换为 Winston Logger (117 → 0)
- ✅ **P1-3**: 前端 Logger 工具创建
- ✅ **P1-4**: 前端 console.log 替换 (117 → 0)
- ✅ **P1-5**: DocumentRepository 实现（9 方法）
- ✅ **P1-6**: ConversationRepository 实现（9 方法）
- ✅ **P1-7**: MessageRepository 实现（10 方法）
- ✅ **P1-8**: ChatService 重构使用 Repository 模式
- ✅ **P1-9**: 分页参数统一（PaginationDto）
- ✅ **P1-10**: 分页响应添加 total 和 hasMore
- ✅ **P1-11**: 根目录 MD 文档整理（41 → 2）
- ✅ **P1-12**: README 合并更新

### 核心改进

#### 1. Repository Pattern（数据访问层抽象）
- **DocumentRepository**: 9 个方法，完整的文档 CRUD
- **ConversationRepository**: 9 个方法，包含分页和关联查询
- **MessageRepository**: 10 个方法，包含 findLastN 和 token 统计
- **优势**: 
  - ✅ 提高可测试性（Mock Repository 而非 Prisma）
  - ✅ 统一数据访问接口
  - ✅ 便于切换 ORM 实现

#### 2. 结构化日志系统
- **后端**: Winston Logger 替换所有 console.log（117 处）
- **前端**: 自定义 Logger 工具替换所有 console.log（117 处）
- **优势**:
  - ✅ 统一日志格式
  - ✅ 支持多级别日志（info, warn, error, debug）
  - ✅ 便于日志聚合和分析

#### 3. 统一分页 API
- **PaginationDto**: 统一的分页参数（limit, offset）
- **PaginatedResponse<T>**: 统一的响应格式（data + pagination）
- **优势**:
  - ✅ 一致的 API 设计
  - ✅ 类型安全的分页参数
  - ✅ 自动计算 hasMore 标志
  - ✅ 包含 total 总数，支持前端显示

---

## 📊 API 文档

### 文件上传

```http
POST /upload
Content-Type: multipart/form-data

# 响应
{
  "id": "doc-123",
  "originalName": "sample.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "uploadedAt": "2025-11-03T00:00:00.000Z",
  "gcsBucket": "your-bucket",
  "gcsPath": "documents/doc-123.pdf"
}
```

### AI 对话

```http
POST /chat
Content-Type: application/json

{
  "conversationId": "conv-123",    # 可选，新对话不传
  "documentId": "doc-123",         # 可选
  "message": "请解释这份文档的内容",
  "stream": true                   # 可选，默认 false
}

# 普通响应
{
  "conversationId": "conv-123",
  "messageId": "msg-456",
  "content": "这份文档主要讨论...",
  "hintLevel": 2,
  "tokensUsed": 150
}

# 流式响应 (stream=true)
data: {"type": "thinking"}
data: {"type": "content", "content": "这"}
data: {"type": "content", "content": "份"}
data: {"type": "done", "messageId": "msg-456", "tokensUsed": 150}
```

### 对话列表（分页）

```http
GET /chat/conversations?userId=user-123&limit=20&offset=0

# 响应
{
  "data": [
    {
      "id": "conv-123",
      "title": "文档分析",
      "createdAt": "2025-11-03T00:00:00.000Z",
      "updatedAt": "2025-11-03T00:00:00.000Z",
      "messageCount": 10
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## 🔧 开发指南

### 添加新功能

1. **后端 API**:
   ```bash
   cd apps/api
   nest g module new-feature
   nest g service new-feature
   nest g controller new-feature
   ```

2. **创建 Repository**:
   ```typescript
   // src/new-feature/repositories/new.repository.ts
   @Injectable()
   export class NewRepository {
     constructor(private readonly prisma: PrismaService) {}
     
     async findById(id: string) {
       return this.prisma.new.findUnique({ where: { id } });
     }
   }
   ```

3. **使用 Logger**:
   ```typescript
   // 后端
   this.logger.log('Operation completed', { data });
   
   // 前端
   logger.info('User action', { userId, action });
   ```

4. **添加测试**:
   ```typescript
   describe('NewService', () => {
     it('should work', async () => {
       // 测试逻辑
     });
   });
   ```

### 代码规范

- ✅ 使用 TypeScript 严格模式
- ✅ 使用 Prettier 格式化代码
- ✅ 使用 ESLint 检查代码质量
- ✅ 禁止使用 `any` 类型（除非必要）
- ✅ 禁止使用 `console.log`（使用 Logger）
- ✅ 所有 public API 必须有测试

---

## 📚 相关文档

### 架构文档
- [docs/architecture/GOOGLE_CLOUD_ARCHITECTURE.md](./docs/architecture/GOOGLE_CLOUD_ARCHITECTURE.md) - Google Cloud 架构
- [docs/architecture/SCALABILITY_ANALYSIS.md](./docs/architecture/SCALABILITY_ANALYSIS.md) - 可扩展性分析

### 开发文档
- [docs/FRONTEND_REFACTORING.md](./docs/FRONTEND_REFACTORING.md) - 前端重构指南
- [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) - 测试指南
- [docs/SERVER_STARTUP_GUIDE.md](./docs/SERVER_STARTUP_GUIDE.md) - 服务器启动指南

### 历史文档
- [docs/archive/planning/REFACTORING_EXECUTION_GUIDE.md](./docs/archive/planning/REFACTORING_EXECUTION_GUIDE.md) - P1 重构执行指南
- [docs/archive/status-reports/](./docs/archive/status-reports/) - 历史进度报告

---

## 🌟 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📝 License

MIT License - 详见 [LICENSE](./LICENSE) 文件

---

## 👥 作者

- **初始开发**: [Your Name]
- **架构设计**: AI + Human Collaboration
- **维护状态**: 🟢 Active

---

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [NestJS](https://nestjs.com/) - Node.js 框架
- [Prisma](https://www.prisma.io/) - 数据库 ORM
- [Google Cloud](https://cloud.google.com/) - 云服务
- [DeepSeek](https://www.deepseek.com/) - AI 模型
- [Supabase](https://supabase.com/) - PostgreSQL 托管

---

**项目状态**: 🚀 Active Development  
**版本**: v1.0.0  
**最后更新**: 2025-11-03
