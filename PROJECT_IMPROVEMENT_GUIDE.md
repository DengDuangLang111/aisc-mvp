# Study Oasis Simple - 项目改进指南

> 本文档用于指导 AI 助手（如 GitHub Copilot）进行项目的后续开发和优化。
>
> **当前版本**: v0.1.0 (原型阶段)
> **目标版本**: v1.0.0 (生产可用)
> **预计工作量**: 3-4 周

---

## 📋 目录

1. [项目概述](#项目概述)
2. [当前架构](#当前架构)
3. [已知问题清单](#已知问题清单)
4. [改进任务路线图](#改进任务路线图)
5. [技术实现细节](#技术实现细节)
6. [验收标准](#验收标准)

---

## 项目概述

### 项目简介
**Study Oasis Simple** 是一个 AI 驱动的智能学习助手平台，核心特性是**渐进式提示系统** - 根据学生的提问次数逐步增加提示详细程度，帮助学生独立思考而非直接给出答案。

### 技术栈

#### 前端
- **框架**: Next.js 16.0.1 (App Router)
- **UI 库**: React 19.2.0
- **样式**: Tailwind CSS 4.x
- **语言**: TypeScript 5.x
- **测试**: Jest + React Testing Library

#### 后端
- **框架**: NestJS 11.0.1
- **运行时**: Node.js (Express)
- **语言**: TypeScript 5.7.3
- **文件处理**: Multer
- **验证**: Zod

#### 共享
- **包管理**: pnpm workspace
- **类型定义**: `@study-oasis/contracts` (Zod schemas)

### 目录结构

```
study_oasis_simple/
├── apps/
│   └── api/                    # NestJS 后端
│       ├── src/
│       │   ├── chat/          # AI 对话模块
│       │   └── upload/        # 文件上传模块
│       └── uploads/           # 上传文件存储
├── study_oasis_simple/
│   ├── apps/
│   │   └── web/               # Next.js 前端
│   └── packages/
│       └── contracts/         # 共享类型定义
└── [配置文件]
```

---

## 当前架构

### 核心功能

#### 1. 文件上传流程
```
用户 → 选择文件 → 前端 FormData → POST /upload → Multer 保存 → 返回文件信息
```

**相关文件**:
- 前端: `study_oasis_simple/apps/web/app/upload/page.tsx`
- 后端: `apps/api/src/upload/upload.controller.ts`
- 后端: `apps/api/src/upload/upload.service.ts` ⚠️ **目前是空的**

#### 2. AI 对话流程
```
用户输入 → 前端收集历史 → POST /chat → 计算提示等级 → 生成回复 → 展示结果
```

**相关文件**:
- 前端: `study_oasis_simple/apps/web/app/chat/page.tsx`
- 后端: `apps/api/src/chat/chat.controller.ts`
- 后端: `apps/api/src/chat/chat.service.ts`

#### 3. 渐进式提示算法

```typescript
// apps/api/src/chat/chat.service.ts
private calculateHintLevel(userMessageCount: number): HintLevel {
  if (userMessageCount <= 1) return 1;  // 🤔 轻微提示
  if (userMessageCount <= 3) return 2;  // 💡 中等提示
  return 3;                             // ✨ 详细提示
}
```

### 数据流

```
前端 (React State)
  ↓
fetch API (HTTP)
  ↓
后端 Controller (路由)
  ↓
后端 Service (业务逻辑)
  ↓
返回 JSON 响应
```

---

## 已知问题清单

### 🔴 严重问题（P0 - 必须修复）

#### 问题 1: UploadService 完全为空
**文件**: `apps/api/src/upload/upload.service.ts`
**当前代码**:
```typescript
@Injectable()
export class UploadService {}
```

**问题描述**:
- 所有文件上传逻辑都在 `UploadController` 中
- 违反了 NestJS 的最佳实践（Controller 应该只处理 HTTP，业务逻辑应在 Service）
- 未来扩展困难（如添加文件验证、清理、存储切换等）

**影响**: 代码架构不合理，难以维护和测试

---

#### 问题 2: 类型定义重复
**文件**:
- `apps/api/src/chat/chat.types.ts` (重复定义)
- `study_oasis_simple/packages/contracts/src/chat.ts` (标准定义)

**问题描述**:
- 相同的类型（Message, ChatRequest, ChatResponse 等）在两个地方定义
- 后端使用 `chat.types.ts`，但 contracts 包已经有相同定义
- 维护成本高，容易不同步

**影响**: 类型不一致风险，维护困难

---

#### 问题 3: 硬编码的 API URL
**文件**:
- `study_oasis_simple/apps/web/app/upload/page.tsx:35`
- `study_oasis_simple/apps/web/app/chat/page.tsx:20`
- `study_oasis_simple/apps/web/app/chat/page.tsx:41`
- `apps/api/src/upload/upload.controller.ts:26`

**当前代码**:
```typescript
// 硬编码在多个地方
fetch('http://localhost:4000/upload', ...)
const fileUrl = `http://localhost:4000/uploads/${fileId}...`
url: `http://localhost:4000/uploads/${file.filename}`
```

**问题描述**:
- URL 硬编码导致无法部署到生产环境
- 每次更改需要修改多个文件
- 无法区分开发/测试/生产环境

**影响**: 无法部署，环境管理困难

---

#### 问题 4: 文件上传无安全验证
**文件**: `apps/api/src/upload/upload.controller.ts`

**当前代码**:
```typescript
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueId = randomUUID();
        const ext = extname(file.originalname);
        cb(null, `${uniqueId}${ext}`);
      },
    }),
  }),
)
```

**问题描述**:
- ❌ 没有文件类型验证（可以上传 .exe 等危险文件）
- ❌ 没有文件大小限制（可能被恶意上传大文件攻击）
- ❌ 没有 MIME 类型检查
- ❌ 文件名只基于扩展名（可能被伪造）

**影响**: 严重的安全漏洞

---

### 🟡 中等问题（P1 - 应该修复）

#### 问题 5: AI 回复是硬编码模板
**文件**: `apps/api/src/chat/chat.service.ts:52-65`

**当前代码**:
```typescript
private generateHintResponse(message: string, hintLevel: HintLevel): string {
  if (hintLevel === 1) {
    return `🤔 这是一个好问题！让我给你一个提示：\n\n试着思考这个问题的关键概念是什么...`;
  }
  // ... 固定模板
}
```

**问题描述**:
- 无法根据实际问题内容生成回复
- 没有接入真实的 AI API（OpenAI, Anthropic Claude 等）
- 用户体验差，无法提供实际帮助

**影响**: 核心功能不可用

---

#### 问题 6: 对话历史不持久化
**文件**: `study_oasis_simple/apps/web/app/chat/page.tsx:12`

**当前代码**:
```typescript
const [messages, setMessages] = useState<Message[]>([])
```

**问题描述**:
- 对话历史只存储在 React state 中
- 刷新页面即丢失所有对话
- 无法跨设备访问历史记录

**影响**: 用户体验差，无法追溯学习记录

---

#### 问题 7: 上传的文件未与对话关联
**文件**: `apps/api/src/chat/chat.service.ts:16`

**当前代码**:
```typescript
async chat(request: ChatRequest): Promise<ChatResponse> {
  const { message, conversationHistory = [] } = request;
  // ❌ uploadId 参数被忽略了
```

**问题描述**:
- `ChatRequest` 有 `uploadId` 字段，但完全没有使用
- AI 无法读取上传的文件内容
- 文件上传功能形同虚设

**影响**: 核心功能链路断裂

---

#### 问题 8: 错误处理过于简单
**文件**: `study_oasis_simple/apps/web/app/chat/page.tsx:66-71`

**当前代码**:
```typescript
catch (err) {
  setError('发送消息失败，请重试')
  console.error('Chat error:', err)
}
```

**问题描述**:
- 所有错误都是相同的提示
- 没有区分网络错误、服务器错误、业务错误
- 后端也没有统一的异常处理机制

**影响**: 难以调试，用户体验差

---

### 🟢 小问题（P2 - 可选优化）

#### 问题 9: TypeScript 严格模式未完全启用
**文件**: `apps/api/tsconfig.json`

**当前配置**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": false  // ⚠️ 关闭了严格检查
  }
}
```

---

#### 问题 10: CORS 配置过于宽松
**文件**: `apps/api/src/main.ts`

**当前代码**:
```typescript
app.enableCors();  // 允许所有来源
```

---

#### 问题 11: 缺少日志系统
**问题描述**: 只有 `console.log`，没有结构化日志

---

#### 问题 12: 后端测试几乎为空
**问题描述**: 测试文件只有骨架，没有实际测试逻辑

---

## 改进任务路线图

### 第 1 阶段：架构修复（3-5 天）⚠️ 优先级最高

#### Task 1.1: 重构 UploadService
**目标**: 将文件上传逻辑从 Controller 移到 Service，添加完整的验证和错误处理

**要求**:
1. 在 `apps/api/src/upload/upload.service.ts` 中实现以下方法：
   - `validateFile(file: Express.Multer.File)`: 验证文件类型和大小
   - `saveFile(file: Express.Multer.File)`: 保存文件并返回信息
   - `getFileInfo(fileId: string)`: 获取文件信息
   - `deleteFile(fileId: string)`: 删除文件（清理功能）

2. 文件验证规则：
   - **允许的 MIME 类型**: `application/pdf`, `text/plain`, `image/jpeg`, `image/png`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
   - **最大文件大小**: 10MB
   - **文件名安全**: 使用 UUID + 原始扩展名

3. 修改 `upload.controller.ts`，将逻辑委托给 Service

**技术细节**:
```typescript
// upload.service.ts 实现示例

import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UploadService {
  private readonly uploadDir = './uploads';
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedMimeTypes = [
    'application/pdf',
    'text/plain',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  /**
   * 验证文件是否符合要求
   */
  validateFile(file: Express.Multer.File): void {
    // 1. 检查文件大小
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `文件大小超过限制 (最大 ${this.maxFileSize / 1024 / 1024}MB)`
      );
    }

    // 2. 检查 MIME 类型
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文件类型: ${file.mimetype}`
      );
    }

    // 3. 检查文件扩展名（防止伪造 MIME）
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException(
        `不支持的文件扩展名: ${ext}`
      );
    }
  }

  /**
   * 保存文件并返回信息
   */
  async saveFile(file: Express.Multer.File) {
    this.validateFile(file);

    const fileId = path.parse(file.filename).name; // UUID 部分
    const ext = path.extname(file.filename);

    return {
      id: fileId,
      filename: file.originalname,
      url: `/uploads/${file.filename}`,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * 获取文件信息（未来用于读取文件内容）
   */
  async getFileInfo(fileId: string) {
    const files = await fs.readdir(this.uploadDir);
    const targetFile = files.find(f => f.startsWith(fileId));

    if (!targetFile) {
      throw new BadRequestException(`文件不存在: ${fileId}`);
    }

    const filePath = path.join(this.uploadDir, targetFile);
    const stats = await fs.stat(filePath);

    return {
      id: fileId,
      filename: targetFile,
      path: filePath,
      size: stats.size,
      createdAt: stats.birthtime,
    };
  }

  /**
   * 读取文本文件内容（用于 AI 上下文）
   */
  async readFileContent(fileId: string): Promise<string> {
    const fileInfo = await this.getFileInfo(fileId);

    // 只支持文本文件
    if (fileInfo.filename.endsWith('.txt')) {
      return await fs.readFile(fileInfo.path, 'utf-8');
    }

    // PDF 需要额外的解析库（如 pdf-parse）
    if (fileInfo.filename.endsWith('.pdf')) {
      // TODO: 使用 pdf-parse 提取文本
      throw new BadRequestException('PDF 解析功能待实现');
    }

    throw new BadRequestException('不支持读取该文件类型');
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: string): Promise<void> {
    const fileInfo = await this.getFileInfo(fileId);
    await fs.unlink(fileInfo.path);
  }
}
```

**验收标准**:
- [ ] `UploadService` 包含所有必要方法
- [ ] 文件上传会触发验证
- [ ] 不符合规则的文件会被拒绝，并返回清晰的错误信息
- [ ] `UploadController` 代码简洁，只负责路由

---

#### Task 1.2: 统一类型定义
**目标**: 删除重复的类型定义，统一使用 `@study-oasis/contracts`

**要求**:
1. 删除 `apps/api/src/chat/chat.types.ts` 文件
2. 修改所有引用该文件的地方，改为从 `@study-oasis/contracts` 导入
3. 确保前后端使用相同的类型

**技术细节**:
```typescript
// 修改前 (chat.controller.ts)
import type { ChatRequest, ChatResponse } from './chat.types';

// 修改后
import type { ChatRequest, ChatResponse } from '@study-oasis/contracts';
```

```typescript
// 修改前 (chat.service.ts)
import type { ChatRequest, ChatResponse, HintLevel, Message } from './chat.types';

// 修改后
import type {
  ChatRequest,
  ChatResponse,
  HintLevel,
  Message
} from '@study-oasis/contracts';
```

**验收标准**:
- [ ] `chat.types.ts` 文件已删除
- [ ] 所有导入都来自 `@study-oasis/contracts`
- [ ] 项目编译通过，无类型错误

---

#### Task 1.3: 添加环境变量配置
**目标**: 消除硬编码 URL，支持多环境部署

**要求**:

1. **前端配置** (`study_oasis_simple/apps/web/.env.local`):
```env
# API 配置
NEXT_PUBLIC_API_URL=http://localhost:4000

# 其他配置
NEXT_PUBLIC_APP_NAME=Study Oasis Simple
```

2. **后端配置** (`apps/api/.env`):
```env
# 服务配置
PORT=4000
NODE_ENV=development

# CORS 配置
CORS_ORIGINS=http://localhost:3000

# 文件上传配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

3. **前端使用环境变量**:
```typescript
// study_oasis_simple/apps/web/lib/config.ts
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Study Oasis',
} as const;
```

```typescript
// 修改 upload/page.tsx
import { config } from '@/lib/config';

const res = await fetch(`${config.apiUrl}/upload`, {
  method: "POST",
  body: fd,
});
```

```typescript
// 修改 chat/page.tsx
import { config } from '@/lib/config';

const fileUrl = fileId
  ? `${config.apiUrl}/uploads/${fileId}.${filename?.split('.').pop()}`
  : undefined;

const response = await fetch(`${config.apiUrl}/chat`, {
  method: 'POST',
  // ...
});
```

4. **后端使用环境变量** (使用 `@nestjs/config`):

安装依赖:
```bash
cd apps/api
pnpm add @nestjs/config
```

修改 `app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // ... 其他模块
  ],
})
export class AppModule {}
```

修改 `main.ts`:
```typescript
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 从环境变量读取配置
  const port = configService.get<number>('PORT', 4000);
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');

  app.enableCors({
    origin: corsOrigins.split(','),
    credentials: true,
  });

  app.useStaticAssets('uploads', { prefix: '/uploads/' });

  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}
bootstrap();
```

修改 `upload.service.ts`:
```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly maxFileSize: number;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR', './uploads');
    this.maxFileSize = this.configService.get<number>('MAX_FILE_SIZE', 10485760);
  }
  // ...
}
```

5. **添加到 .gitignore**:
```gitignore
# 环境变量文件
.env
.env.local
.env.production
```

**验收标准**:
- [ ] 前后端都有 `.env` 文件（不提交到 git）
- [ ] 代码中没有硬编码的 URL
- [ ] 可以通过修改 `.env` 切换环境
- [ ] 提供 `.env.example` 文件作为模板

---

#### Task 1.4: 添加文件上传安全验证
**目标**: 在 Multer 层面添加验证，防止恶意文件上传

**要求**:
修改 `upload.controller.ts`，在 `FileInterceptor` 配置中添加 `fileFilter` 和 `limits`:

```typescript
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueId = randomUUID();
          const ext = extname(file.originalname);
          cb(null, `${uniqueId}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // 允许的 MIME 类型
        const allowedMimes = [
          'application/pdf',
          'text/plain',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];

        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              `不支持的文件类型: ${file.mimetype}。` +
              `支持的类型: PDF, TXT, DOC, DOCX, JPG, PNG`
            ),
            false
          );
        }

        // 检查扩展名（防止 MIME 伪造）
        const ext = extname(file.originalname).toLowerCase();
        const allowedExts = ['.pdf', '.txt', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

        if (!allowedExts.includes(ext)) {
          return cb(
            new BadRequestException(`不支持的文件扩展名: ${ext}`),
            false
          );
        }

        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1, // 每次只能上传一个文件
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    // 使用 Service 保存文件
    return this.uploadService.saveFile(file);
  }
}
```

**验收标准**:
- [ ] 上传不支持的文件类型会返回 400 错误
- [ ] 上传超过 10MB 的文件会返回 400 错误
- [ ] 错误信息清晰易懂
- [ ] 使用 Postman 测试各种边界情况

---

### 第 2 阶段：核心功能实现（5-7 天）

#### Task 2.1: 集成真实 AI API
**目标**: 替换硬编码回复，接入 OpenAI 或 Anthropic Claude API

**技术选择**:
- **推荐**: OpenAI GPT-4 (易于集成，文档完善)
- **备选**: Anthropic Claude (更适合教育场景)

**要求**:

1. **安装依赖**:
```bash
cd apps/api
pnpm add openai
```

2. **添加环境变量** (`apps/api/.env`):
```env
# OpenAI 配置
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

3. **创建 AI 服务** (`apps/api/src/ai/ai.service.ts`):
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { HintLevel } from '@study-oasis/contracts';

@Injectable()
export class AiService {
  private openai: OpenAI;
  private model: string;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4');
  }

  /**
   * 根据提示等级生成系统提示词
   */
  private buildSystemPrompt(hintLevel: HintLevel): string {
    const basePrompt = `你是一个 AI 学习助手，遵循"渐进式提示"教学法，帮助学生独立思考。

**核心原则**：
- 永远不要直接给出答案
- 通过引导性问题帮助学生自己找到答案
- 鼓励学生的思考过程`;

    switch (hintLevel) {
      case 1:
        return `${basePrompt}

**当前提示等级**: Level 1 (轻微提示)
**策略**: 只给方向性的提示
- 指出问题的关键概念
- 建议思考的角度
- 不提供具体步骤
- 用问题引导思考`;

      case 2:
        return `${basePrompt}

**当前提示等级**: Level 2 (中等提示)
**策略**: 提供思路框架
- 列出解决问题的步骤框架
- 给出相关的概念和公式
- 提供思考的检查点
- 用具体例子类比`;

      case 3:
        return `${basePrompt}

**当前提示等级**: Level 3 (详细提示)
**策略**: 接近答案但不给出
- 详细分析问题结构
- 提供完整的解题思路
- 给出关键推导步骤
- 但最后一步留给学生完成`;
    }
  }

  /**
   * 生成渐进式提示回复
   */
  async generateHintResponse(
    userMessage: string,
    hintLevel: HintLevel,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    fileContext?: string,
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(hintLevel);

    // 构建消息历史
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // 如果有上传的文件，添加到上下文
    if (fileContext) {
      messages.push({
        role: 'system',
        content: `用户上传了以下学习材料，你可以参考这些内容来回答：\n\n${fileContext}`,
      });
    }

    // 添加对话历史
    messages.push(
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    );

    // 添加当前问题
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // 调用 OpenAI API
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0].message.content || '抱歉，我无法生成回复。';
    } catch (error) {
      console.error('OpenAI API 错误:', error);
      throw new Error('AI 服务暂时不可用，请稍后重试');
    }
  }
}
```

4. **创建 AI 模块** (`apps/api/src/ai/ai.module.ts`):
```typescript
import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
```

5. **修改 ChatService** (`apps/api/src/chat/chat.service.ts`):
```typescript
import { Injectable } from '@nestjs/common';
import type { ChatRequest, ChatResponse, HintLevel } from '@study-oasis/contracts';
import { AiService } from '../ai/ai.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly aiService: AiService,
    private readonly uploadService: UploadService,
  ) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { message, conversationHistory = [], uploadId } = request;

    // 计算提示等级
    const userMessageCount = conversationHistory.filter(
      msg => msg.role === 'user',
    ).length;
    const hintLevel = this.calculateHintLevel(userMessageCount);

    // 如果有上传文件，读取文件内容作为上下文
    let fileContext: string | undefined;
    if (uploadId) {
      try {
        fileContext = await this.uploadService.readFileContent(uploadId);
      } catch (error) {
        console.warn(`无法读取文件 ${uploadId}:`, error.message);
      }
    }

    // 生成 AI 回复
    const reply = await this.aiService.generateHintResponse(
      message,
      hintLevel,
      conversationHistory,
      fileContext,
    );

    return {
      reply,
      hintLevel,
      timestamp: Date.now(),
    };
  }

  private calculateHintLevel(userMessageCount: number): HintLevel {
    if (userMessageCount <= 1) return 1;
    if (userMessageCount <= 3) return 2;
    return 3;
  }
}
```

6. **更新模块依赖** (`apps/api/src/chat/chat.module.ts`):
```typescript
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiModule } from '../ai/ai.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [AiModule, UploadModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
```

7. **确保 UploadModule 导出 Service** (`apps/api/src/upload/upload.module.ts`):
```typescript
import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService], // 导出以供其他模块使用
})
export class UploadModule {}
```

**验收标准**:
- [ ] AI 能根据实际问题内容生成回复
- [ ] 不同 hintLevel 的回复风格明显不同
- [ ] 如果有上传文件，AI 能基于文件内容回答
- [ ] API 错误能被正确处理并返回友好提示

---

#### Task 2.2: 实现 PDF 文件解析
**目标**: 支持从上传的 PDF 文件中提取文本作为 AI 上下文

**要求**:

1. **安装依赖**:
```bash
cd apps/api
pnpm add pdf-parse
```

2. **修改 UploadService** (`apps/api/src/upload/upload.service.ts`):
```typescript
import * as pdfParse from 'pdf-parse';

@Injectable()
export class UploadService {
  // ... 现有代码

  /**
   * 读取文件内容（支持 TXT 和 PDF）
   */
  async readFileContent(fileId: string): Promise<string> {
    const fileInfo = await this.getFileInfo(fileId);
    const filePath = fileInfo.path;

    // 处理纯文本文件
    if (fileInfo.filename.endsWith('.txt')) {
      return await fs.readFile(filePath, 'utf-8');
    }

    // 处理 PDF 文件
    if (fileInfo.filename.endsWith('.pdf')) {
      const dataBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text; // 提取的文本内容
    }

    // 其他文件类型暂不支持
    throw new BadRequestException(
      `暂不支持读取 ${path.extname(fileInfo.filename)} 文件内容`
    );
  }
}
```

**验收标准**:
- [ ] 上传 PDF 文件后，AI 能读取其中的文本内容
- [ ] 在对话中引用 PDF 内容
- [ ] 处理 PDF 解析错误（如加密 PDF）

---

#### Task 2.3: 实现对话历史持久化
**目标**: 将对话历史保存到后端，支持跨设备访问

**技术选择**:
- **简单方案**: JSON 文件存储（适合原型）
- **推荐方案**: 使用 SQLite 数据库
- **生产方案**: PostgreSQL + Prisma ORM

这里采用 **SQLite + Prisma** 方案（易于迁移到 PostgreSQL）。

**要求**:

1. **安装 Prisma**:
```bash
cd apps/api
pnpm add @prisma/client
pnpm add -D prisma
npx prisma init --datasource-provider sqlite
```

2. **定义数据模型** (`apps/api/prisma/schema.prisma`):
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model Conversation {
  id        String    @id @default(uuid())
  uploadId  String?   // 关联的上传文件
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String       // 'user' | 'assistant'
  content        String
  hintLevel      Int?         // 仅 assistant 消息有
  timestamp      BigInt       // Unix timestamp
  createdAt      DateTime     @default(now())

  @@index([conversationId])
}
```

3. **生成 Prisma Client**:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

4. **创建 Prisma 服务** (`apps/api/src/prisma/prisma.service.ts`):
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

5. **创建 Prisma 模块** (`apps/api/src/prisma/prisma.module.ts`):
```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

6. **修改 ChatService** (`apps/api/src/chat/chat.service.ts`):
```typescript
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly aiService: AiService,
    private readonly uploadService: UploadService,
    private readonly prisma: PrismaService,
  ) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { message, conversationId, uploadId } = request;

    // 1. 获取或创建对话
    let conversation;
    if (conversationId) {
      conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: true },
      });
    } else {
      conversation = await this.prisma.conversation.create({
        data: { uploadId },
        include: { messages: true },
      });
    }

    // 2. 计算提示等级
    const userMessageCount = conversation.messages.filter(
      msg => msg.role === 'user',
    ).length;
    const hintLevel = this.calculateHintLevel(userMessageCount);

    // 3. 保存用户消息
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
        timestamp: BigInt(Date.now()),
      },
    });

    // 4. 读取文件上下文
    let fileContext: string | undefined;
    if (conversation.uploadId) {
      try {
        fileContext = await this.uploadService.readFileContent(conversation.uploadId);
      } catch (error) {
        console.warn('无法读取文件:', error.message);
      }
    }

    // 5. 生成 AI 回复
    const conversationHistory = conversation.messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    const reply = await this.aiService.generateHintResponse(
      message,
      hintLevel,
      conversationHistory,
      fileContext,
    );

    // 6. 保存 AI 回复
    const timestamp = Date.now();
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: reply,
        hintLevel,
        timestamp: BigInt(timestamp),
      },
    });

    return {
      reply,
      hintLevel,
      timestamp,
      conversationId: conversation.id, // 返回给前端
    };
  }

  /**
   * 获取对话历史
   */
  async getConversation(conversationId: string) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  private calculateHintLevel(userMessageCount: number): HintLevel {
    if (userMessageCount <= 1) return 1;
    if (userMessageCount <= 3) return 2;
    return 3;
  }
}
```

7. **更新类型定义** (`study_oasis_simple/packages/contracts/src/chat.ts`):
```typescript
// 修改 ChatRequest
export const ChatRequestSchema = z.object({
  conversationId: z.string().uuid().optional(), // 新增
  uploadId: z.string().uuid().optional(),
  message: z.string().min(1).max(1000),
  conversationHistory: z.array(MessageSchema).optional(), // 废弃，改用 conversationId
});

// 修改 ChatResponse
export const ChatResponseSchema = z.object({
  reply: z.string(),
  hintLevel: HintLevelSchema,
  timestamp: z.number(),
  conversationId: z.string().uuid(), // 新增
  sources: z.array(z.string()).optional(),
});
```

8. **修改前端** (`study_oasis_simple/apps/web/app/chat/page.tsx`):
```typescript
const [conversationId, setConversationId] = useState<string | undefined>(undefined);

const handleSend = async (content: string) => {
  // ... 现有代码

  const response = await fetch(`${config.apiUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversationId,
      message: content,
      uploadId: fileId || undefined,
    }),
  });

  const data = await response.json();

  // 保存 conversationId
  if (!conversationId) {
    setConversationId(data.conversationId);
  }

  // ... 添加消息到 UI
};
```

9. **添加 API 获取历史** (`apps/api/src/chat/chat.controller.ts`):
```typescript
@Get(':id')
async getConversation(@Param('id') id: string) {
  return this.chatService.getConversation(id);
}
```

**验收标准**:
- [ ] 对话会自动保存到数据库
- [ ] 刷新页面不会丢失对话
- [ ] 可以通过 conversationId 恢复历史对话
- [ ] 数据库迁移文件正确生成

---

#### Task 2.4: 添加统一错误处理
**目标**: 实现后端统一异常过滤器和前端错误处理

**后端实现**:

1. **创建异常过滤器** (`apps/api/src/common/filters/http-exception.filter.ts`):
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getResponse<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        details = (exceptionResponse as any).details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 记录错误日志
    console.error(`[${new Date().toISOString()}] ${status} - ${message}`, exception);

    response.status(status).json({
      statusCode: status,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

2. **全局注册** (`apps/api/src/main.ts`):
```typescript
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // ... 其他配置
}
```

**前端实现**:

3. **创建 API 工具** (`study_oasis_simple/apps/web/lib/api.ts`):
```typescript
import { config } from './config';

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${config.apiUrl}${endpoint}`;

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        response.status,
        errorData.message || '请求失败',
        errorData.details,
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // 网络错误
    if (error instanceof TypeError) {
      throw new ApiError(0, '网络连接失败，请检查后端服务是否运行');
    }

    throw new ApiError(500, '未知错误');
  }
}
```

4. **修改前端使用** (`study_oasis_simple/apps/web/app/chat/page.tsx`):
```typescript
import { fetchApi, ApiError } from '@/lib/api';

const handleSend = async (content: string) => {
  // ... 添加用户消息

  try {
    const data = await fetchApi<ChatResponse>('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        message: content,
        uploadId: fileId || undefined,
      }),
    });

    // ... 添加助手消息
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.statusCode === 0) {
        setError('网络连接失败，请检查后端服务');
      } else if (error.statusCode === 429) {
        setError('请求过于频繁，请稍后再试');
      } else if (error.statusCode >= 500) {
        setError('服务器错误，请稍后重试');
      } else {
        setError(error.message);
      }
    } else {
      setError('发送消息失败，请重试');
    }
    console.error('Chat error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**验收标准**:
- [ ] 后端所有异常都被统一处理
- [ ] 前端能区分不同类型的错误
- [ ] 错误信息对用户友好
- [ ] 开发环境有详细的错误日志

---

### 第 3 阶段：质量提升（3-5 天）

#### Task 3.1: 完善后端测试
**目标**: 为核心业务逻辑添加单元测试

**要求**:

1. **测试 UploadService** (`apps/api/src/upload/upload.service.spec.ts`):
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { ConfigService } from '@nestjs/config';

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'UPLOAD_DIR') return './uploads';
              if (key === 'MAX_FILE_SIZE') return 10485760;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  describe('validateFile', () => {
    it('应该接受 PDF 文件', () => {
      const mockFile = {
        size: 1024,
        mimetype: 'application/pdf',
        originalname: 'test.pdf',
      } as Express.Multer.File;

      expect(() => service.validateFile(mockFile)).not.toThrow();
    });

    it('应该拒绝超大文件', () => {
      const mockFile = {
        size: 20 * 1024 * 1024, // 20MB
        mimetype: 'application/pdf',
        originalname: 'large.pdf',
      } as Express.Multer.File;

      expect(() => service.validateFile(mockFile)).toThrow(BadRequestException);
    });

    it('应该拒绝不支持的文件类型', () => {
      const mockFile = {
        size: 1024,
        mimetype: 'application/x-executable',
        originalname: 'malware.exe',
      } as Express.Multer.File;

      expect(() => service.validateFile(mockFile)).toThrow(BadRequestException);
    });
  });
});
```

2. **测试 ChatService** (`apps/api/src/chat/chat.service.spec.ts`):
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { AiService } from '../ai/ai.service';
import { UploadService } from '../upload/upload.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ChatService', () => {
  let service: ChatService;
  let aiService: AiService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: AiService,
          useValue: {
            generateHintResponse: jest.fn().mockResolvedValue('AI 回复'),
          },
        },
        {
          provide: UploadService,
          useValue: {
            readFileContent: jest.fn().mockResolvedValue('文件内容'),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            conversation: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            message: {
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    aiService = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('calculateHintLevel', () => {
    it('第一次提问应该返回 Level 1', () => {
      const level = service['calculateHintLevel'](0);
      expect(level).toBe(1);
    });

    it('第 3 次提问应该返回 Level 2', () => {
      const level = service['calculateHintLevel'](2);
      expect(level).toBe(2);
    });

    it('第 5 次提问应该返回 Level 3', () => {
      const level = service['calculateHintLevel'](4);
      expect(level).toBe(3);
    });
  });

  // 更多测试...
});
```

**验收标准**:
- [ ] 核心业务逻辑有单元测试覆盖
- [ ] 测试通过率 100%
- [ ] `pnpm test` 命令能运行所有测试

---

#### Task 3.2: 添加日志系统
**目标**: 使用结构化日志替代 `console.log`

**要求**:

1. **安装依赖**:
```bash
cd apps/api
pnpm add winston nest-winston
```

2. **配置 Winston** (`apps/api/src/main.ts`):
```typescript
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `[${timestamp}] [${context}] ${level}: ${message}`;
            }),
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.json(),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.json(),
        }),
      ],
    }),
  });
  // ...
}
```

3. **在服务中使用** (`apps/api/src/chat/chat.service.ts`):
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.logger.log(`收到聊天请求: ${request.message.substring(0, 50)}...`);

    try {
      // ... 业务逻辑
      this.logger.log(`生成回复，提示等级: ${hintLevel}`);
      return response;
    } catch (error) {
      this.logger.error(`聊天处理失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

**验收标准**:
- [ ] 所有 `console.log` 替换为 Logger
- [ ] 日志包含时间戳和上下文
- [ ] 错误日志保存到文件

---

#### Task 3.3: 优化前端 UI/UX
**目标**: 改善用户体验

**要求**:

1. **添加重试机制**:
```typescript
// study_oasis_simple/apps/web/lib/api.ts
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
  retries = 3,
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchApiOnce<T>(endpoint, options);
    } catch (error) {
      if (i === retries - 1 || error instanceof ApiError) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('不应该到达这里');
}
```

2. **防止重复提交**:
```typescript
// chat/page.tsx
const [isLoading, setIsLoading] = useState(false);

const handleSend = async (content: string) => {
  if (isLoading) return; // 防止重复提交
  setIsLoading(true);
  try {
    // ... 发送逻辑
  } finally {
    setIsLoading(false);
  }
};
```

3. **添加 loading 动画**:
```typescript
{isLoading && (
  <div className="flex items-center gap-2 text-gray-500 text-sm">
    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
    <span>AI 正在思考...</span>
  </div>
)}
```

**验收标准**:
- [ ] 发送消息时有明显的 loading 状态
- [ ] 网络错误会自动重试
- [ ] 无法重复点击发送按钮

---

### 第 4 阶段：部署准备（2-3 天）

#### Task 4.1: Docker 化
**目标**: 使用 Docker 容器化应用

**要求**:

1. **后端 Dockerfile** (`apps/api/Dockerfile`):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

2. **前端 Dockerfile** (`study_oasis_simple/apps/web/Dockerfile`):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["pnpm", "start"]
```

3. **Docker Compose** (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  api:
    build:
      context: ./apps/api
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./prod.db
    env_file:
      - ./apps/api/.env
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs

  web:
    build:
      context: ./study_oasis_simple/apps/web
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:4000
    depends_on:
      - api
```

**验收标准**:
- [ ] `docker-compose up` 能启动完整应用
- [ ] 容器之间网络通信正常
- [ ] 数据持久化正常

---

#### Task 4.2: 添加健康检查
**目标**: 提供服务健康状态检查端点

**要求**:

1. **后端健康检查** (`apps/api/src/app.controller.ts`):
```typescript
@Get('health')
async healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await this.checkDatabase(),
  };
}

private async checkDatabase() {
  try {
    await this.prisma.$queryRaw`SELECT 1`;
    return 'connected';
  } catch {
    return 'disconnected';
  }
}
```

**验收标准**:
- [ ] GET /health 返回服务状态
- [ ] 包含数据库连接状态

---

## 验收标准

### 阶段 1 完成标准
- [ ] 所有 P0 问题已修复
- [ ] 代码通过 ESLint 检查
- [ ] 前后端都使用环境变量

### 阶段 2 完成标准
- [ ] AI 能生成真实回复
- [ ] 支持 PDF 文件解析
- [ ] 对话历史能持久化
- [ ] 错误处理完善

### 阶段 3 完成标准
- [ ] 测试覆盖率 > 60%
- [ ] 所有测试通过
- [ ] 有结构化日志

### 阶段 4 完成标准
- [ ] Docker 化完成
- [ ] 健康检查可用
- [ ] 可一键部署

---

## 开发建议

### 给 Copilot 的提示词模板

当你开始某个任务时，可以使用以下提示词：

```
我正在开发 Study Oasis Simple 项目，需要完成以下任务：

【任务编号】: Task X.X
【任务名称】: [从上面复制]
【当前文件】: [文件路径]
【要求】: [从上面复制具体要求]

请帮我：
1. 分析当前代码结构
2. 实现所需功能
3. 确保代码符合项目规范（TypeScript strict, NestJS 最佳实践）
4. 添加必要的错误处理
5. 编写单元测试（如适用）

参考技术细节部分的代码示例。
```

### 注意事项

1. **按顺序执行**: 任务有依赖关系，请按阶段顺序完成
2. **测试优先**: 每完成一个功能，立即测试
3. **提交规范**: 每个 Task 完成后提交一次 Git
4. **文档更新**: 修改功能后更新相关文档

### 提交信息规范

```bash
# 功能
git commit -m "feat(upload): 添加文件类型验证"

# 修复
git commit -m "fix(chat): 修复 AI 回复为空的问题"

# 重构
git commit -m "refactor(upload): 将逻辑从 Controller 移到 Service"

# 测试
git commit -m "test(chat): 添加 ChatService 单元测试"

# 文档
git commit -m "docs: 更新部署指南"
```

---

## 附录

### 推荐的开发工具

- **IDE**: VSCode + Prettier + ESLint 插件
- **API 测试**: Postman 或 Insomnia
- **数据库管理**: Prisma Studio (`npx prisma studio`)
- **日志查看**: tail -f logs/combined.log

### 参考资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [Next.js 官方文档](https://nextjs.org/docs)
- [Prisma 官方文档](https://www.prisma.io/docs)
- [OpenAI API 文档](https://platform.openai.com/docs)

---

**Good luck with your development! 🚀**
