# 重构执行计划

## 项目概况
- **项目名称**: Study Oasis
- **技术栈**: NestJS + Next.js 16 + React 19 + Prisma + PostgreSQL
- **当前状态**: 功能完整，但存在技术债
- **代码质量评分**: 7/10

---

## 重构目标

1. 消除所有 `any` 类型（167 处）
2. 移除生产环境的 console.log（123 处）
3. 抽取重复代码（Google Cloud 认证等）
4. 添加 Repository 抽象层
5. 拆分过长的方法和服务
6. 添加缺失的类型定义

**预计总工作量**: 2-3 周（分阶段执行）

---

## 阶段一：类型安全修复（高优先级）

### 任务 1.1: 修复 ChatService 中的 any 类型

**文件**: `apps/api/src/chat/chat.service.ts`

**问题位置**:
- Line 140: `map((msg: any) => ...)`
- Line 242: `map((msg: any) => ...)`
- Line 291: `map((msg: any) => ...)`
- Line 456: `conversations.map((conv: any) => ...)`

**执行步骤**:

1. 在文件顶部添加类型定义：

```typescript
// apps/api/src/chat/chat.service.ts

// 添加这些接口定义
interface MessageWithRelations {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: Date;
  conversationId: string;
  tokenCount?: number;
}

interface ConversationWithMessages {
  id: string;
  title: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: MessageWithRelations[];
}

interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: Date;
  createdAt: Date;
}

interface ConversationDetail {
  id: string;
  title: string;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}
```

2. 替换第 140 行附近的 any：

**Before**:
```typescript
map((msg: any) => ({
  role: msg.role,
  content: msg.content,
}))
```

**After**:
```typescript
map((msg: MessageWithRelations) => ({
  role: msg.role,
  content: msg.content,
}))
```

3. 替换第 242 行附近的 any：

**Before**:
```typescript
const chatHistory = conversation.messages.map((msg: any) => ({
  role: msg.role,
  content: msg.content,
}));
```

**After**:
```typescript
const chatHistory = conversation.messages.map((msg: MessageWithRelations) => ({
  role: msg.role,
  content: msg.content,
}));
```

4. 替换第 456 行附近的 any：

**Before**:
```typescript
return conversations.map((conv: any) => {
  const lastMessage = conv.messages[conv.messages.length - 1];
  return {
    id: conv.id,
    title: conv.title,
    messageCount: conv._count.messages,
    lastMessageAt: lastMessage?.createdAt || conv.createdAt,
    createdAt: conv.createdAt,
  };
});
```

**After**:
```typescript
return conversations.map((conv: ConversationWithMessages): ConversationSummary => {
  const lastMessage = conv.messages[conv.messages.length - 1];
  return {
    id: conv.id,
    title: conv.title,
    messageCount: conv.messages.length,
    lastMessageAt: lastMessage?.createdAt || conv.createdAt,
    createdAt: conv.createdAt,
  };
});
```

5. 修复 `getConversation` 方法返回类型（Line 257）：

**Before**:
```typescript
async getConversation(conversationId: string): Promise<any> {
```

**After**:
```typescript
async getConversation(conversationId: string): Promise<ConversationDetail | null> {
```

**验证**:
```bash
cd apps/api
npm run build
npm run test chat.service.spec.ts
```

---

### 任务 1.2: 修复 UploadController 中的 any 类型

**文件**: `apps/api/src/upload/upload.controller.ts`

**问题位置**:
- Line 294: `documents.map((doc: any) => ...)`

**执行步骤**:

1. 在文件顶部添加类型定义：

```typescript
// apps/api/src/upload/upload.controller.ts

interface DocumentWithOcrResult {
  id: string;
  filename: string;
  uploadPath: string;
  mimeType: string;
  fileSize: number;
  userId: string | null;
  createdAt: Date;
  ocrResult: {
    confidence: number;
    pageCount: number;
  } | null;
}

interface DocumentListItemDto {
  id: string;
  filename: string;
  uploadPath: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  ocrConfidence: number | null;
  pageCount: number | null;
}
```

2. 替换 Line 294 的 any：

**Before**:
```typescript
return documents.map((doc: any) => ({
  id: doc.id,
  filename: doc.filename,
  uploadPath: doc.uploadPath,
  mimeType: doc.mimeType,
  fileSize: doc.fileSize,
  createdAt: doc.createdAt,
  ocrStatus: doc.ocrResult ? 'completed' : 'pending',
  ocrConfidence: doc.ocrResult?.confidence || null,
  pageCount: doc.ocrResult?.pageCount || null,
}));
```

**After**:
```typescript
return documents.map((doc: DocumentWithOcrResult): DocumentListItemDto => ({
  id: doc.id,
  filename: doc.filename,
  uploadPath: doc.uploadPath,
  mimeType: doc.mimeType,
  fileSize: doc.fileSize,
  createdAt: doc.createdAt,
  ocrStatus: doc.ocrResult ? 'completed' : 'pending',
  ocrConfidence: doc.ocrResult?.confidence || null,
  pageCount: doc.ocrResult?.pageCount || null,
}));
```

**验证**:
```bash
cd apps/api
npm run build
npm run test upload.controller.spec.ts
```

---

### 任务 1.3: 修复 VisionService 中的 any 类型

**文件**: `apps/api/src/ocr/vision.service.ts`

**问题位置**:
- Line 51: `private getCredentials(): any`
- Line 110-150: OCR 结果处理中的 any

**执行步骤**:

1. 定义 Google Cloud 认证类型：

```typescript
// apps/api/src/ocr/vision.service.ts

interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface VisionApiTextAnnotation {
  description?: string;
  locale?: string;
  boundingPoly?: {
    vertices: Array<{ x: number; y: number }>;
  };
}

interface VisionApiResponse {
  textAnnotations?: VisionApiTextAnnotation[];
  fullTextAnnotation?: {
    pages: Array<{
      confidence: number;
      width: number;
      height: number;
    }>;
    text: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

interface OcrResult {
  text: string;
  confidence: number;
  pageCount: number;
  detectedLanguage?: string;
}
```

2. 修复 `getCredentials` 方法：

**Before**:
```typescript
private getCredentials(): any {
```

**After**:
```typescript
private getCredentials(): GoogleCredentials {
```

3. 修复 OCR 结果处理（Line 110-150）：

**Before**:
```typescript
const [result] = await this.client.documentTextDetection(gcsPath);
const fullText = result.fullTextAnnotation?.text || '';
// ... 使用 any 类型的地方
```

**After**:
```typescript
const [result] = await this.client.documentTextDetection(gcsPath) as [VisionApiResponse];

if (result.error) {
  throw new Error(`Vision API error: ${result.error.message}`);
}

const fullText = result.fullTextAnnotation?.text || '';
const pages = result.fullTextAnnotation?.pages || [];
const avgConfidence = pages.length > 0
  ? pages.reduce((sum, page) => sum + (page.confidence || 0), 0) / pages.length
  : 0;

const detectedLanguage = result.textAnnotations?.[0]?.locale;

const ocrResult: OcrResult = {
  text: fullText,
  confidence: avgConfidence,
  pageCount: pages.length || 1,
  detectedLanguage,
};

return ocrResult;
```

**验证**:
```bash
cd apps/api
npm run build
npm run test vision.service.spec.ts
```

---

### 任务 1.4: 修复 GcsService 中的 any 类型

**文件**: `apps/api/src/gcs/gcs.service.ts`

**执行步骤**:

1. 复用 GoogleCredentials 类型（抽取到共享位置）：

```typescript
// apps/api/src/gcs/gcs.service.ts
import { GoogleCredentials } from '../common/types/google-credentials.interface';
```

2. 修复 `getCredentials` 方法：

**Before**:
```typescript
private getCredentials(): any {
```

**After**:
```typescript
private getCredentials(): GoogleCredentials {
```

**验证**:
```bash
cd apps/api
npm run build
```

---

### 任务 1.5: 修复前端代码中的 any 类型

**文件**: `apps/web/app/chat/hooks/useChatLogic.ts`

**执行步骤**:

1. 添加类型定义：

```typescript
// apps/web/app/chat/hooks/useChatLogic.ts

interface StreamChunk {
  delta?: string;
  done?: boolean;
  error?: string;
}

interface ApiMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface ApiConversation {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
}
```

2. 在所有使用 `any` 的地方替换为具体类型

3. 修复 fetch 响应处理：

**Before**:
```typescript
const data = await response.json();
```

**After**:
```typescript
const data: ApiConversation[] = await response.json();
```

**验证**:
```bash
cd apps/web
npm run build
npm run type-check
```

---

## 阶段二：移除 console.log（高优先级）

### 任务 2.1: 后端 console.log 替换

**全局查找和替换规则**:

**在所有 `apps/api/src/**/*.ts` 文件中**:

1. 单参数 console.log:

**Before**:
```typescript
console.log('Some message');
```

**After**:
```typescript
this.logger.debug('Some message');
```

2. 多参数 console.log:

**Before**:
```typescript
console.log('Message:', value, data);
```

**After**:
```typescript
this.logger.debug('Message', { value, data });
```

3. console.error:

**Before**:
```typescript
console.error('Error:', error);
```

**After**:
```typescript
this.logger.error('Error', { error: error.message, stack: error.stack });
```

**批量执行命令**:
```bash
cd apps/api

# 查找所有 console.log
grep -rn "console\." src/

# 逐个文件替换（需要手动审查每个）
```

**重点文件**:
1. `apps/api/src/chat/chat.controller.ts` (Line 89, 740)
2. `apps/api/src/chat/chat.service.ts` (多处)
3. `apps/api/src/upload/upload.service.ts` (多处)

---

### 任务 2.2: 前端 console.log 替换

**文件**: `apps/web/app/chat/hooks/useChatLogic.ts`

**执行步骤**:

1. 创建前端 logger 工具：

```typescript
// apps/web/lib/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: any[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  info: (...args: any[]) => {
    console.log('[INFO]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
};
```

2. 替换所有 console.log:

**Before**:
```typescript
console.log('Received message:', message);
```

**After**:
```typescript
import { logger } from '@/lib/logger';

logger.debug('Received message:', message);
```

**验证**:
```bash
cd apps/web
npm run build
```

---

## 阶段三：抽取共享服务（中优先级）

### 任务 3.1: 创建 GoogleCloudAuthService

**目标**: 消除 `vision.service.ts` 和 `gcs.service.ts` 中的重复代码

**执行步骤**:

1. 创建共享类型文件：

```typescript
// apps/api/src/common/types/google-credentials.interface.ts
export interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}
```

2. 创建认证服务：

```typescript
// apps/api/src/common/services/google-cloud-auth.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleCredentials } from '../types/google-credentials.interface';

@Injectable()
export class GoogleCloudAuthService {
  private readonly logger = new Logger(GoogleCloudAuthService.name);

  constructor(private configService: ConfigService) {}

  getCredentials(): GoogleCredentials {
    try {
      const base64Creds = this.configService.get<string>('GOOGLE_CREDENTIALS_BASE64');

      if (!base64Creds) {
        throw new Error('GOOGLE_CREDENTIALS_BASE64 environment variable is not set');
      }

      const jsonString = Buffer.from(base64Creds, 'base64').toString('utf-8');
      const credentials = JSON.parse(jsonString) as GoogleCredentials;

      // 验证必需字段
      const requiredFields = [
        'type',
        'project_id',
        'private_key',
        'client_email',
      ];

      for (const field of requiredFields) {
        if (!credentials[field as keyof GoogleCredentials]) {
          throw new Error(`Missing required credential field: ${field}`);
        }
      }

      this.logger.log('Google Cloud credentials loaded successfully');
      return credentials;

    } catch (error) {
      this.logger.error('Failed to load Google Cloud credentials', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  getProjectId(): string {
    return this.getCredentials().project_id;
  }

  getClientEmail(): string {
    return this.getCredentials().client_email;
  }
}
```

3. 注册到模块：

```typescript
// apps/api/src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { GoogleCloudAuthService } from './services/google-cloud-auth.service';

@Global()
@Module({
  providers: [GoogleCloudAuthService],
  exports: [GoogleCloudAuthService],
})
export class CommonModule {}
```

4. 更新 `app.module.ts`:

```typescript
// apps/api/src/app.module.ts
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    CommonModule, // 添加这行
    // ... 其他 imports
  ],
})
export class AppModule {}
```

5. 重构 `vision.service.ts`:

**Before**:
```typescript
private getCredentials(): any {
  // 40+ lines of code
}

async onModuleInit() {
  const credentials = this.getCredentials();
  this.client = new ImageAnnotatorClient({
    credentials: credentials,
  });
}
```

**After**:
```typescript
constructor(
  private configService: ConfigService,
  private googleAuthService: GoogleCloudAuthService, // 注入
) {}

async onModuleInit() {
  const credentials = this.googleAuthService.getCredentials();
  this.client = new ImageAnnotatorClient({
    credentials: credentials,
  });
}

// 删除 getCredentials() 方法
```

6. 重构 `gcs.service.ts`:

**同样的模式，注入 `GoogleCloudAuthService` 并删除重复代码**

**验证**:
```bash
cd apps/api
npm run build
npm run test
```

---

## 阶段四：添加 Repository 层（中优先级）

### 任务 4.1: 创建 ConversationRepository

**执行步骤**:

1. 创建 repository 文件：

```typescript
// apps/api/src/chat/repositories/conversation.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Conversation, Message, Prisma } from '@prisma/client';

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ConversationWithCount extends Conversation {
  _count: {
    messages: number;
  };
  messages: Message[];
}

@Injectable()
export class ConversationRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    title: string;
    userId?: string;
  }): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: {
        title: data.title,
        userId: data.userId || null,
      },
    });
  }

  async findById(id: string): Promise<ConversationWithMessages | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findMany(params: {
    userId?: string;
    limit?: number;
    orderBy?: Prisma.ConversationOrderByWithRelationInput;
  }): Promise<ConversationWithCount[]> {
    const { userId, limit = 20, orderBy } = params;

    return this.prisma.conversation.findMany({
      where: userId ? { userId } : {},
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: orderBy || { updatedAt: 'desc' },
      take: limit,
    });
  }

  async updateTitle(id: string, title: string): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: { title, updatedAt: new Date() },
    });
  }

  async delete(id: string): Promise<Conversation> {
    return this.prisma.conversation.delete({
      where: { id },
    });
  }
}
```

2. 创建 MessageRepository:

```typescript
// apps/api/src/chat/repositories/message.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Message } from '@prisma/client';

@Injectable()
export class MessageRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokenCount?: number;
  }): Promise<Message> {
    return this.prisma.message.create({
      data,
    });
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteByConversationId(conversationId: string): Promise<number> {
    const result = await this.prisma.message.deleteMany({
      where: { conversationId },
    });
    return result.count;
  }
}
```

3. 注册到模块：

```typescript
// apps/api/src/chat/chat.module.ts
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';

@Module({
  // ...
  providers: [
    ChatService,
    ConversationRepository,
    MessageRepository,
    // ...
  ],
})
export class ChatModule {}
```

4. 重构 ChatService 使用 Repository：

**Before**:
```typescript
async getConversation(conversationId: string): Promise<any> {
  const conversation = await this.prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  // ...
}
```

**After**:
```typescript
constructor(
  private conversationRepo: ConversationRepository,
  private messageRepo: MessageRepository,
  // ... 其他依赖
) {}

async getConversation(conversationId: string): Promise<ConversationDetail | null> {
  const conversation = await this.conversationRepo.findById(conversationId);
  // ...
}

async getConversations(userId?: string, limit: number = 20): Promise<ConversationSummary[]> {
  const conversations = await this.conversationRepo.findMany({
    userId,
    limit,
  });
  // ...
}
```

**验证**:
```bash
cd apps/api
npm run build
npm run test chat.service.spec.ts
```

---

### 任务 4.2: 创建 DocumentRepository

**执行步骤**:

1. 创建 repository:

```typescript
// apps/api/src/upload/repositories/document.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, OcrResult, Prisma } from '@prisma/client';

export interface DocumentWithOcr extends Document {
  ocrResult: OcrResult | null;
}

@Injectable()
export class DocumentRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    filename: string;
    originalName: string;
    uploadPath: string;
    mimeType: string;
    fileSize: number;
    userId?: string;
  }): Promise<Document> {
    return this.prisma.document.create({
      data: {
        ...data,
        userId: data.userId || null,
      },
    });
  }

  async findById(id: string): Promise<DocumentWithOcr | null> {
    return this.prisma.document.findUnique({
      where: { id },
      include: { ocrResult: true },
    });
  }

  async findMany(params: {
    userId?: string;
    limit?: number;
  }): Promise<DocumentWithOcr[]> {
    return this.prisma.document.findMany({
      where: params.userId ? { userId: params.userId } : {},
      include: {
        ocrResult: {
          select: {
            confidence: true,
            pageCount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
    });
  }

  async updateOcrStatus(
    documentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
  ): Promise<Document> {
    return this.prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: status },
    });
  }

  async delete(id: string): Promise<Document> {
    return this.prisma.document.delete({
      where: { id },
    });
  }
}
```

2. 注册并在 UploadService 中使用

**验证**:
```bash
cd apps/api
npm run build
npm run test upload.service.spec.ts
```

---

## 阶段五：拆分长方法（中优先级）

### 任务 5.1: 拆分 ChatService.chatStream()

**文件**: `apps/api/src/chat/chat.service.ts`

**当前问题**: Line 612-799, 187 行

**执行步骤**:

1. 提取系统提示构建逻辑：

```typescript
// apps/api/src/chat/chat.service.ts

private buildSystemPrompt(
  conversationHistory: Array<{ role: string; content: string }>,
  relatedDocuments: Array<{ content: string; filename: string }>,
): string {
  let systemPrompt = `You are a helpful AI assistant. Current time: ${new Date().toISOString()}`;

  if (relatedDocuments.length > 0) {
    systemPrompt += '\n\n## Available Documents:\n\n';
    relatedDocuments.forEach((doc, index) => {
      systemPrompt += `### Document ${index + 1}: ${doc.filename}\n`;
      systemPrompt += `${doc.content.substring(0, 2000)}\n\n`;
    });
    systemPrompt += '## Instructions:\nUse the above documents to answer user questions accurately.';
  }

  return systemPrompt;
}
```

2. 提取消息准备逻辑：

```typescript
private prepareMessages(
  conversationHistory: Array<{ role: string; content: string }>,
  newMessage: string,
  systemPrompt: string,
): Array<{ role: string; content: string }> {
  return [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10), // Keep last 10 messages
    { role: 'user', content: newMessage },
  ];
}
```

3. 提取 API 调用逻辑：

```typescript
private async callDeepSeekStream(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
): Promise<ReadableStream> {
  const response = await this.httpService.axiosRef.post(
    this.DEEPSEEK_API_URL,
    {
      model: this.DEEPSEEK_MODEL,
      messages,
      stream: true,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      responseType: 'stream',
      timeout: 60000,
    },
  );

  return response.data;
}
```

4. 重构主方法：

**After**:
```typescript
async *chatStream(
  message: string,
  conversationId?: string,
  userId?: string,
  documentIds?: string[],
): AsyncGenerator<ChatStreamChunk, void, unknown> {
  // 1. 加载会话历史
  const conversationHistory = await this.loadConversationHistory(conversationId);

  // 2. 加载相关文档
  const relatedDocuments = await this.loadRelatedDocuments(documentIds);

  // 3. 构建消息
  const systemPrompt = this.buildSystemPrompt(conversationHistory, relatedDocuments);
  const messages = this.prepareMessages(conversationHistory, message, systemPrompt);

  // 4. 调用 AI
  const stream = await this.callDeepSeekStream(messages, this.apiKey);

  // 5. 处理流式响应
  yield* this.processStreamResponse(stream, conversationId, userId, message);
}
```

**验证**:
```bash
cd apps/api
npm run build
npm run test chat.service.spec.ts
```

---

### 任务 5.2: 拆分 UploadService.saveFile()

**文件**: `apps/api/src/upload/upload.service.ts`

**当前问题**: Line 171-374, 204 行

**执行步骤**:

1. 创建独立的验证服务：

```typescript
// apps/api/src/upload/services/file-validator.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { FileTypeResult, fileTypeFromBuffer } from 'file-type';

interface FileValidationResult {
  isValid: boolean;
  detectedMime: string;
  error?: string;
}

@Injectable()
export class FileValidatorService {
  private readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.sh', '.ps1',
    '.msi', '.app', '.deb', '.rpm',
  ];

  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/tiff',
  ];

  async validateFile(
    file: Express.Multer.File,
    declaredMimeType: string,
  ): Promise<FileValidationResult> {
    // 1. 检查文件大小
    if (file.size > 50 * 1024 * 1024) {
      throw new BadRequestException('文件大小不能超过 50MB');
    }

    // 2. 检查危险扩展名
    const originalName = file.originalname.toLowerCase();
    if (this.hasDangerousExtension(originalName)) {
      throw new BadRequestException('不允许的文件类型');
    }

    // 3. 验证 MIME 类型
    const detectedType = await fileTypeFromBuffer(file.buffer);
    const detectedMime = detectedType?.mime || 'application/octet-stream';

    if (!this.ALLOWED_MIME_TYPES.includes(detectedMime)) {
      throw new BadRequestException(`不支持的文件类型: ${detectedMime}`);
    }

    // 4. 验证声明类型与实际类型匹配
    if (declaredMimeType !== detectedMime) {
      throw new BadRequestException(
        `文件类型不匹配。声明: ${declaredMimeType}, 实际: ${detectedMime}`,
      );
    }

    return {
      isValid: true,
      detectedMime,
    };
  }

  private hasDangerousExtension(filename: string): boolean {
    return this.DANGEROUS_EXTENSIONS.some(ext => filename.endsWith(ext));
  }

  sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 255);
  }
}
```

2. 创建文件存储服务：

```typescript
// apps/api/src/upload/services/file-storage.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import * as path from 'path';

interface StorageResult {
  filepath: string;
  filename: string;
  uploadDir: string;
}

@Injectable()
export class FileStorageService {
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') || './uploads';
  }

  async saveFile(
    fileBuffer: Buffer,
    originalName: string,
  ): Promise<StorageResult> {
    // 1. 确保上传目录存在
    await fs.ensureDir(this.uploadDir);

    // 2. 生成唯一文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(originalName);
    const filename = `${timestamp}_${randomString}${ext}`;

    // 3. 保存文件
    const filepath = path.join(this.uploadDir, filename);
    await fs.writeFile(filepath, fileBuffer);

    return {
      filepath,
      filename,
      uploadDir: this.uploadDir,
    };
  }

  async deleteFile(filepath: string): Promise<void> {
    await fs.remove(filepath);
  }

  async fileExists(filepath: string): Promise<boolean> {
    return fs.pathExists(filepath);
  }
}
```

3. 重构 UploadService.saveFile():

**After**:
```typescript
// apps/api/src/upload/upload.service.ts

constructor(
  private prisma: PrismaService,
  private fileValidator: FileValidatorService,
  private fileStorage: FileStorageService,
  private documentRepo: DocumentRepository,
  // ... 其他依赖
) {}

async saveFile(file: Express.Multer.File, userId?: string): Promise<Document> {
  // 1. 验证文件
  const validation = await this.fileValidator.validateFile(
    file,
    file.mimetype,
  );

  // 2. 清理文件名
  const sanitizedName = this.fileValidator.sanitizeFilename(file.originalname);

  // 3. 存储文件
  const storage = await this.fileStorage.saveFile(file.buffer, sanitizedName);

  // 4. 保存到数据库
  const document = await this.documentRepo.create({
    filename: storage.filename,
    originalName: sanitizedName,
    uploadPath: storage.filepath,
    mimeType: validation.detectedMime,
    fileSize: file.size,
    userId,
  });

  // 5. 追踪事件
  await this.trackUploadEvent(document, userId);

  return document;
}
```

4. 注册新服务：

```typescript
// apps/api/src/upload/upload.module.ts
import { FileValidatorService } from './services/file-validator.service';
import { FileStorageService } from './services/file-storage.service';

@Module({
  providers: [
    UploadService,
    FileValidatorService,
    FileStorageService,
    DocumentRepository,
    // ...
  ],
})
export class UploadModule {}
```

**验证**:
```bash
cd apps/api
npm run build
npm run test upload.service.spec.ts
```

---

## 阶段六：添加分页功能（低优先级）

### 任务 6.1: 为 getConversations 添加分页

**文件**: `apps/api/src/chat/chat.service.ts`

**执行步骤**:

1. 创建分页 DTO:

```typescript
// apps/api/src/chat/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Cursor for pagination (conversation ID)' })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    total?: number;
  };
}
```

2. 更新 ConversationRepository:

```typescript
// apps/api/src/chat/repositories/conversation.repository.ts

async findManyPaginated(params: {
  userId?: string;
  limit: number;
  cursor?: string;
}): Promise<{ data: ConversationWithCount[]; hasMore: boolean; nextCursor: string | null }> {
  const { userId, limit, cursor } = params;

  const conversations = await this.prisma.conversation.findMany({
    where: userId ? { userId } : {},
    include: {
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1, // 多取一个判断是否有更多
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // 跳过 cursor
    }),
  });

  const hasMore = conversations.length > limit;
  const data = hasMore ? conversations.slice(0, -1) : conversations;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return { data, hasMore, nextCursor };
}
```

3. 更新 ChatController:

```typescript
// apps/api/src/chat/chat.controller.ts

@Get('conversations')
async getConversations(
  @Query() paginationDto: PaginationDto,
  @Query('userId') userId?: string,
): Promise<PaginatedResponse<ConversationSummary>> {
  return this.chatService.getConversationsPaginated(
    userId,
    paginationDto.limit || 20,
    paginationDto.cursor,
  );
}
```

4. 更新 ChatService:

```typescript
// apps/api/src/chat/chat.service.ts

async getConversationsPaginated(
  userId?: string,
  limit: number = 20,
  cursor?: string,
): Promise<PaginatedResponse<ConversationSummary>> {
  const result = await this.conversationRepo.findManyPaginated({
    userId,
    limit,
    cursor,
  });

  const data = result.data.map((conv): ConversationSummary => {
    const lastMessage = conv.messages[0];
    return {
      id: conv.id,
      title: conv.title,
      messageCount: conv._count.messages,
      lastMessageAt: lastMessage?.createdAt || conv.createdAt,
      createdAt: conv.createdAt,
    };
  });

  return {
    data,
    pagination: {
      hasMore: result.hasMore,
      nextCursor: result.nextCursor,
    },
  };
}
```

**验证**:
```bash
cd apps/api
npm run build
npm run test chat.controller.spec.ts

# 测试 API
curl "http://localhost:3001/api/chat/conversations?limit=10"
curl "http://localhost:3001/api/chat/conversations?limit=10&cursor=<conversation_id>"
```

---

## 验证清单

### 全局验证步骤

执行每个阶段后运行：

```bash
# 1. 类型检查
cd apps/api && npm run build
cd apps/web && npm run build

# 2. 运行测试
cd apps/api && npm run test
cd apps/web && npm run test

# 3. 代码质量检查
cd apps/api && npm run lint
cd apps/web && npm run lint

# 4. 启动服务验证
cd apps/api && npm run start:dev
# 在另一个终端
cd apps/web && npm run dev

# 5. 手动功能测试
# - 上传文件
# - 触发 OCR
# - 发送聊天消息
# - 查看会话列表
```

---

## 回滚计划

每个阶段开始前创建 git 分支：

```bash
# 阶段一
git checkout -b refactor/phase-1-types
# ... 完成工作
git commit -m "refactor: Phase 1 - Fix any types"

# 阶段二
git checkout -b refactor/phase-2-logging
# ... 完成工作
git commit -m "refactor: Phase 2 - Remove console.log"

# 以此类推
```

如果出现问题：
```bash
git checkout main
git branch -D refactor/phase-X-xxx
```

---

## 性能指标

### 重构前
- TypeScript 编译时间: ~15s
- 测试运行时间: ~30s
- 类型错误: 0 (但有 167 个 any)

### 预期重构后
- TypeScript 编译时间: ~12s (更少的 any 类型推断)
- 测试运行时间: ~25s (更好的模块隔离)
- 类型错误: 0
- 类型覆盖率: 95%+

---

## 总结

### 工作量估算

| 阶段 | 任务数 | 预估时间 | 优先级 |
|------|--------|----------|--------|
| 阶段一：类型修复 | 5 | 3-4 天 | 高 |
| 阶段二：日志清理 | 2 | 1-2 天 | 高 |
| 阶段三：共享服务 | 1 | 1 天 | 中 |
| 阶段四：Repository | 2 | 2-3 天 | 中 |
| 阶段五：拆分方法 | 2 | 2-3 天 | 中 |
| 阶段六：分页功能 | 1 | 1 天 | 低 |
| **总计** | **13** | **10-16 天** | - |

### 关键成功指标

- ✅ 0 个 `any` 类型（从 167 个）
- ✅ 0 个生产环境 console.log（从 123 个）
- ✅ 代码重复率 < 3%（目前约 8%）
- ✅ 平均方法长度 < 50 行（目前最长 204 行）
- ✅ 所有测试通过
- ✅ 无功能回退

---

## Copilot 执行指令

### 使用方法

1. **按顺序执行**: 从阶段一开始，完成后再进入下一阶段
2. **验证每个任务**: 完成一个任务后立即验证
3. **创建分支**: 每个阶段在独立分支上工作
4. **提交粒度**: 每完成一个任务就提交一次

### Copilot 提示词模板

```
我正在执行重构计划，当前任务：[任务编号和名称]

请帮我：
1. 阅读 REFACTORING_PLAN.md 中的 [任务编号] 的详细说明
2. 按照 "Before/After" 示例进行代码修改
3. 确保类型安全，不引入新的 any 类型
4. 保持代码功能不变
5. 完成后提示我运行验证命令

文件位置: [文件路径]
```

---

## 联系与支持

如果在重构过程中遇到问题：

1. 查看 git commit history 了解上下文
2. 运行测试定位问题
3. 回滚到上一个稳定版本
4. 逐步重做

**重构愉快！** 🚀
