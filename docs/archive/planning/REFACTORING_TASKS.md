# Study Oasis 代码优化任务清单

> 本文档提供详细的重构任务，适合 AI 助手（如 GitHub Copilot）执行
> 当前代码质量评分：6.5/10 | 目标评分：8.5/10

---

## 📋 优先级说明

- 🔴 **P0 - 严重**：阻塞性问题，必须立即修复
- 🟠 **P1 - 高优先级**：影响代码质量，1周内完成
- 🟡 **P2 - 中优先级**：改进可维护性，2周内完成
- 🟢 **P3 - 低优先级**：锦上添花，3-4周完成

---

## 🔴 P0：严重问题修复

### ✅ 任务 1: 修复 TypeScript 测试配置（已完成）

**状态**: ✅ 已完成

**修改**: `/apps/api/tsconfig.json` 第 22 行
```json
"types": ["jest", "node"]
```

---

### 任务 2: 修复测试文件中的 TypeScript 错误

**文件**: `/apps/api/src/common/interceptors/logging.interceptor.spec.ts`

**问题**: 第 182 行和 221 行，参数 `call` 隐式类型为 `any`

**修复方案**:
```typescript
// 修改前（第 182 行）:
const responseLog = logCalls.find((call) => call[1].includes('200'));

// 修改后:
const responseLog = logCalls.find((call: [string, string]) => call[1].includes('200'));
```

**同样的修改应用于第 221 行**

---

### 任务 3: 修复 upload.service.spec.ts 类型错误

**文件**: `/apps/api/src/upload/upload.service.spec.ts`

**问题**: 第 34 行，`mockPrismaService.upload` 属性不存在

**修复方案**:
```typescript
// 在 beforeEach 中修改 mock 定义
const mockPrismaService = {
  upload: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  ocrResult: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  // ... 其他 mock
} as any;
```

---

### 任务 4: 修复 upload.controller.spec.ts 类型错误

**文件**: `/apps/api/src/upload/upload.controller.spec.ts`

**问题**: 第 112 行，`undefined` 不能赋值给 `File` 类型

**修复方案**:
```typescript
// 修改前:
await expect(controller.uploadFile(undefined)).rejects.toThrow(BadRequestException);

// 修改后:
await expect(controller.uploadFile(null as any)).rejects.toThrow(BadRequestException);
// 或者
await expect(controller.uploadFile({} as Express.Multer.File)).rejects.toThrow(BadRequestException);
```

---

## 🟠 P1：高优先级重构

### 任务 5: 清理所有 console.log 语句

**统计**: 115 处 console.log/error/warn

**执行策略**: 分模块清理

#### 5.1 清理前端 console.log

**文件列表**:
1. `/apps/web/app/chat/hooks/useChatLogic.ts` - 18 处
2. `/apps/web/app/upload/hooks/useUploadLogic.ts` - 3 处
3. `/apps/web/lib/storage.ts` - 18 处
4. `/apps/web/lib/api-client.ts` - 1 处

**修复示例**:

```typescript
// useChatLogic.ts
// 修改前:
console.log(`已加载 ${session.messages.length} 条历史消息`);
console.error('加载会话失败:', e);

// 修改后: 删除或使用环境变量控制
if (process.env.NODE_ENV === 'development') {
  console.debug(`已加载 ${session.messages.length} 条历史消息`);
}
// 生产环境完全移除
```

**storage.ts 处理**:
```typescript
// 可以保留关键错误日志，但要添加环境判断
private log(message: string, level: 'info' | 'error' = 'info') {
  if (process.env.NODE_ENV === 'development') {
    console[level](`[ChatStorage] ${message}`);
  }
}
```

#### 5.2 清理后端 console.log

**文件列表**:
1. `/apps/api/src/chat/chat.controller.ts` - 1 处
2. `/apps/api/src/chat/chat.service.ts` - 4 处

**修复方案**: 全部替换为 Winston logger

```typescript
// 修改前:
console.log('Creating conversation...');

// 修改后:
this.logger.log('Creating conversation...', 'ChatService');
```

**批量查找替换指令**:
```bash
# 在 apps/api/src 目录下查找所有 console.log
grep -rn "console\." --include="*.ts" --exclude-dir=node_modules
```

---

### 任务 6: 消除 any 类型（110 处）

#### 6.1 修复高频文件

**优先级文件**:
1. `/apps/api/src/chat/chat.service.ts` - 10 处
2. `/apps/api/src/upload/upload.service.ts` - 3 处
3. `/apps/api/src/ocr/vision.service.ts` - 10 处
4. `/apps/api/src/analytics/analytics.service.ts` - 8 处

**修复示例 - chat.service.ts**:

```typescript
// 位置 1: Stream 处理函数
// 修改前:
private async handleStreamResponse(stream: any): Promise<string> {

// 修改后:
import { ReadableStream } from 'stream/web';

interface StreamChunk {
  choices: Array<{
    delta: { content?: string };
    finish_reason: string | null;
  }>;
}

private async handleStreamResponse(stream: ReadableStream<Uint8Array>): Promise<string> {
  const decoder = new TextDecoder();
  let fullContent = '';

  for await (const chunk of stream) {
    const text = decoder.decode(chunk);
    const lines = text.split('\n').filter(line => line.trim().startsWith('data:'));

    for (const line of lines) {
      const data = line.replace('data:', '').trim();
      if (data === '[DONE]') break;

      try {
        const parsed: StreamChunk = JSON.parse(data);
        const content = parsed.choices[0]?.delta?.content;
        if (content) fullContent += content;
      } catch (e) {
        // ignore parse errors
      }
    }
  }

  return fullContent;
}
```

**位置 2: 错误处理**
```typescript
// 修改前:
} catch (error: any) {
  this.logger.error('Chat request failed', error);
}

// 修改后:
} catch (error) {
  if (error instanceof Error) {
    this.logger.error('Chat request failed', error.message, error.stack);
  } else {
    this.logger.error('Chat request failed', String(error));
  }
}
```

#### 6.2 在 contracts 包中添加共享类型

**文件**: `/packages/contracts/src/api-responses.ts`（新建）

```typescript
/**
 * API 响应类型定义
 */

// Upload 相关
export interface UploadResponse {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  gcsPath: string;
  publicUrl: string;
  createdAt: string;
  ocrResult?: OcrResult;
}

export interface OcrResult {
  id: string;
  fullText: string;
  language: string;
  confidence: number;
  pageCount: number;
  extractedAt: string;
}

// Analytics 相关
export interface AnalyticsEvent {
  eventName: string;
  category: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// Conversation 相关
export interface Conversation {
  id: string;
  userId: string;
  uploadId?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

// Stream 相关
export interface StreamChunk {
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
    index: number;
  }>;
}
```

**更新 contracts 导出**:

**文件**: `/packages/contracts/src/index.ts`

```typescript
export * from './chat.js';
export * from './api-responses.js';
```

---

### 任务 7: 拆分超大文件

#### 7.1 重构 chat.service.ts（799 行 → 约 200 行/文件）

**目标结构**:
```
apps/api/src/chat/
├── chat.service.ts          # 主服务（200 行）
├── services/
│   ├── deepseek.service.ts     # AI API 调用（150 行）
│   ├── conversation.service.ts  # 对话历史（200 行）
│   └── prompt.service.ts        # 提示词生成（150 行）
├── dto/
│   └── chat-request.dto.ts
└── chat.controller.ts
```

**步骤 1: 创建 DeepSeekService**

**文件**: `/apps/api/src/chat/services/deepseek.service.ts`（新建）

```typescript
import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import axios, { AxiosResponse } from 'axios';

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

interface DeepSeekResponse {
  id: string;
  choices: Array<{
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class DeepSeekService {
  private readonly API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private readonly MODEL = 'deepseek-chat';
  private readonly apiKey: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('DEEPSEEK_API_KEY not configured');
    }
  }

  /**
   * 调用 DeepSeek API（非流式）
   */
  async chat(messages: DeepSeekMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<DeepSeekResponse> {
    const request: DeepSeekRequest = {
      model: this.MODEL,
      messages,
      stream: false,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4000,
    };

    try {
      const response: AxiosResponse<DeepSeekResponse> = await axios.post(
        this.API_URL,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      this.logger.log(`DeepSeek API call successful. Tokens: ${response.data.usage.total_tokens}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error('DeepSeek API call failed', {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message,
        });
      }
      throw error;
    }
  }

  /**
   * 调用 DeepSeek API（流式）
   */
  async chatStream(messages: DeepSeekMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<ReadableStream<Uint8Array>> {
    const request: DeepSeekRequest = {
      model: this.MODEL,
      messages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4000,
    };

    try {
      const response = await axios.post(
        this.API_URL,
        request,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 60000,
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error('DeepSeek stream API call failed', {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message,
        });
      }
      throw error;
    }
  }

  /**
   * 生成系统提示词
   */
  generateSystemPrompt(documentContext?: string, hintLevel?: string): string {
    let systemPrompt = `你是一个专业的学习助手，帮助学生理解和学习知识。
请用清晰、易懂的方式回答问题，适合学生的理解水平。`;

    if (documentContext) {
      systemPrompt += `\n\n以下是相关的学习材料内容：\n\n${documentContext}`;
    }

    if (hintLevel) {
      switch (hintLevel) {
        case 'gentle':
          systemPrompt += '\n\n请提供温和的提示，引导学生自己思考。';
          break;
        case 'moderate':
          systemPrompt += '\n\n请提供适度的提示，给出思路但不直接给答案。';
          break;
        case 'direct':
          systemPrompt += '\n\n请直接提供答案和详细解释。';
          break;
      }
    }

    return systemPrompt;
  }
}
```

**步骤 2: 创建 ConversationService**

**文件**: `/apps/api/src/chat/services/conversation.service.ts`（新建）

```typescript
import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ConversationService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 创建新对话
   */
  async createConversation(userId: string, uploadId?: string, title?: string) {
    try {
      const conversation = await this.prisma.conversation.create({
        data: {
          userId,
          uploadId,
          title: title || '新对话',
        },
      });

      this.logger.log(`Created conversation ${conversation.id} for user ${userId}`);
      return conversation;
    } catch (error) {
      this.logger.error('Failed to create conversation', error);
      throw error;
    }
  }

  /**
   * 获取对话详情
   */
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        upload: {
          include: {
            ocrResult: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return conversation;
  }

  /**
   * 获取用户的所有对话
   */
  async getUserConversations(userId: string, limit = 50, offset = 0) {
    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { userId },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.conversation.count({ where: { userId } }),
    ]);

    return {
      conversations,
      total,
      limit,
      offset,
    };
  }

  /**
   * 保存消息
   */
  async saveMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
  ) {
    try {
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          role,
          content,
        },
      });

      // 更新对话的 updatedAt
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return message;
    } catch (error) {
      this.logger.error(`Failed to save message in conversation ${conversationId}`, error);
      throw error;
    }
  }

  /**
   * 获取对话历史消息
   */
  async getConversationMessages(conversationId: string, userId: string) {
    // 先验证对话归属
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  }

  /**
   * 删除对话
   */
  async deleteConversation(conversationId: string, userId: string) {
    // 先验证归属
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // 删除消息和对话
    await this.prisma.$transaction([
      this.prisma.message.deleteMany({
        where: { conversationId },
      }),
      this.prisma.conversation.delete({
        where: { id: conversationId },
      }),
    ]);

    this.logger.log(`Deleted conversation ${conversationId}`);
  }

  /**
   * 更新对话标题
   */
  async updateConversationTitle(
    conversationId: string,
    userId: string,
    title: string,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  }
}
```

**步骤 3: 重构主 ChatService**

**文件**: `/apps/api/src/chat/chat.service.ts`（重构）

```typescript
import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { VisionService } from '../ocr/vision.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { EventName, EventCategory } from '../analytics/analytics.types';
import type { ChatResponse } from '@study-oasis/contracts';
import { ChatRequestDto } from './dto/chat-request.dto';
import { DeepSeekService } from './services/deepseek.service';
import { ConversationService } from './services/conversation.service';

@Injectable()
export class ChatService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly visionService: VisionService,
    private readonly analyticsService: AnalyticsService,
    private readonly deepseekService: DeepSeekService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * 处理聊天请求（非流式）
   */
  async chat(userId: string, dto: ChatRequestDto): Promise<ChatResponse> {
    const startTime = Date.now();
    let conversationId = dto.conversationId;

    try {
      // 1. 创建或获取对话
      if (!conversationId) {
        const conversation = await this.conversationService.createConversation(
          userId,
          dto.uploadId,
          dto.message.substring(0, 50), // 使用前50字符作为标题
        );
        conversationId = conversation.id;
      }

      // 2. 获取文档上下文
      let documentContext: string | undefined;
      if (dto.uploadId) {
        documentContext = await this.getDocumentContext(dto.uploadId);
      }

      // 3. 构建消息历史
      const messages = await this.buildMessageHistory(conversationId, dto.message);

      // 4. 生成系统提示词
      const systemPrompt = this.deepseekService.generateSystemPrompt(
        documentContext,
        dto.hintLevel,
      );

      // 5. 调用 AI
      const response = await this.deepseekService.chat([
        { role: 'system', content: systemPrompt },
        ...messages,
      ]);

      const aiResponse = response.choices[0].message.content;

      // 6. 保存消息
      await this.conversationService.saveMessage(conversationId, 'user', dto.message);
      await this.conversationService.saveMessage(conversationId, 'assistant', aiResponse);

      // 7. 记录分析事件
      const duration = Date.now() - startTime;
      await this.analyticsService.trackEvent({
        userId,
        eventName: EventName.CHAT_MESSAGE_SENT,
        category: EventCategory.CHAT,
        metadata: {
          conversationId,
          uploadId: dto.uploadId,
          messageLength: dto.message.length,
          responseLength: aiResponse.length,
          duration,
          tokensUsed: response.usage.total_tokens,
        },
      });

      return {
        message: aiResponse,
        conversationId,
      };
    } catch (error) {
      this.logger.error('Chat request failed', error);
      throw error;
    }
  }

  /**
   * 获取文档上下文
   */
  private async getDocumentContext(uploadId: string): Promise<string | undefined> {
    const upload = await this.prisma.upload.findUnique({
      where: { id: uploadId },
      include: { ocrResult: true },
    });

    if (!upload?.ocrResult) {
      return undefined;
    }

    return upload.ocrResult.fullText;
  }

  /**
   * 构建消息历史
   */
  private async buildMessageHistory(
    conversationId: string,
    currentMessage: string,
  ): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 10, // 只取最近10条
    });

    const messages = history.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));

    // 添加当前消息
    messages.push({ role: 'user', content: currentMessage });

    return messages;
  }

  // ... 其他方法（hint、getUserConversations 等）
}
```

**步骤 4: 更新 ChatModule**

**文件**: `/apps/api/src/chat/chat.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DeepSeekService } from './services/deepseek.service';
import { ConversationService } from './services/conversation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VisionModule } from '../ocr/vision.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [PrismaModule, VisionModule, AnalyticsModule],
  controllers: [ChatController],
  providers: [ChatService, DeepSeekService, ConversationService],
  exports: [ChatService],
})
export class ChatModule {}
```

---

#### 7.2 重构 useChatLogic.ts（427 行 → 约 100 行/hook）

**目标结构**:
```
apps/web/app/chat/hooks/
├── useChatLogic.ts          # 主 hook（100 行）
├── useChatMessages.ts       # 消息状态（100 行）
├── useChatStreaming.ts      # 流式处理（150 行）
└── useChatSession.ts        # 会话持久化（80 行）
```

**步骤 1: 创建 useChatSession.ts**

**文件**: `/apps/web/app/chat/hooks/useChatSession.ts`（新建）

```typescript
import { useState, useEffect } from 'react';
import { ChatStorage } from '../../../lib/storage';
import { Message } from '../components/MessageBubble';

interface UseChatSessionOptions {
  fileId: string | null;
  filename: string | null;
}

export function useChatSession({ fileId, filename }: UseChatSessionOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // 加载历史会话
  useEffect(() => {
    if (sessionLoaded) return;

    try {
      let session = null;

      if (fileId) {
        session = ChatStorage.getSessionByFileId(fileId);
      } else {
        const allSessions = ChatStorage.getAllSessions();
        session = allSessions.find(s => !s.fileId) || null;
      }

      if (session && session.messages.length > 0) {
        setMessages(session.messages);

        // 恢复 conversationId
        const lastMsg = session.messages[session.messages.length - 1];
        if (lastMsg && 'conversationId' in lastMsg) {
          setConversationId((lastMsg as Message & { conversationId?: string }).conversationId || null);
        }
      }
    } catch (e) {
      console.error('加载会话失败:', e);
    } finally {
      setSessionLoaded(true);
    }
  }, [fileId, sessionLoaded]);

  // 保存会话
  useEffect(() => {
    if (!sessionLoaded || messages.length === 0) return;

    try {
      ChatStorage.saveSession(
        {
          fileId: fileId || undefined,
          filename: filename || undefined,
          messages,
        },
        undefined,
        conversationId || undefined
      );
    } catch (e) {
      console.error('保存会话失败:', e);
    }
  }, [messages, fileId, filename, sessionLoaded, conversationId]);

  return {
    messages,
    setMessages,
    sessionLoaded,
    conversationId,
    setConversationId,
  };
}
```

**步骤 2: 创建 useChatStreaming.ts**

**文件**: `/apps/web/app/chat/hooks/useChatStreaming.ts`（新建）

```typescript
import { useState, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { ApiClient } from '../../../lib/api-client';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function useChatStreaming() {
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendStreamingMessage = useCallback(async (
    message: string,
    options: {
      uploadId?: string;
      conversationId?: string;
      onUpdate: (content: string) => void;
      onComplete: (content: string, conversationId: string) => void;
      onError: (error: string) => void;
    }
  ) => {
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        abortControllerRef.current = new AbortController();
        setIsThinking(true);
        setIsStreaming(false);
        setStreamingContent('');

        const { stream, conversationId } = await ApiClient.chatStream(
          message,
          options.uploadId || undefined,
          options.conversationId || undefined,
          abortControllerRef.current.signal
        );

        let fullContent = '';
        let isFirstChunk = true;

        for await (const chunk of stream) {
          if (abortControllerRef.current.signal.aborted) {
            break;
          }

          if (isFirstChunk) {
            flushSync(() => {
              setIsThinking(false);
              setIsStreaming(true);
            });
            isFirstChunk = false;
          }

          fullContent += chunk;

          flushSync(() => {
            setStreamingContent(fullContent);
          });

          options.onUpdate(fullContent);
        }

        setIsStreaming(false);
        options.onComplete(fullContent, conversationId);
        break; // 成功，退出重试循环

      } catch (error) {
        retries++;

        if (retries >= MAX_RETRIES) {
          setIsThinking(false);
          setIsStreaming(false);
          options.onError(error instanceof Error ? error.message : '发送失败');
        } else {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
        }
      }
    }
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsThinking(false);
  }, []);

  return {
    streamingContent,
    isStreaming,
    isThinking,
    sendStreamingMessage,
    stopStreaming,
  };
}
```

**步骤 3: 简化主 useChatLogic.ts**

**文件**: `/apps/web/app/chat/hooks/useChatLogic.ts`（重构）

```typescript
import { useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Message } from '../components/MessageBubble';
import { ApiClient, ApiError } from '../../../lib/api-client';
import { useChatSession } from './useChatSession';
import { useChatStreaming } from './useChatStreaming';

export function useChatLogic() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocument, setShowDocument] = useState(true);
  const [uploadId, setUploadId] = useState<string | null>(null);

  const fileId = searchParams.get('fileId');
  const filename = searchParams.get('filename');
  const fileUrl = searchParams.get('fileUrl') || undefined;

  // 使用会话管理 hook
  const {
    messages,
    setMessages,
    sessionLoaded,
    conversationId,
    setConversationId,
  } = useChatSession({ fileId, filename });

  // 使用流式处理 hook
  const {
    streamingContent,
    isStreaming,
    isThinking,
    sendStreamingMessage,
    stopStreaming,
  } = useChatStreaming();

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading || isStreaming) return;

    setError(null);

    // 添加用户消息
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    // 发送流式请求
    await sendStreamingMessage(message, {
      uploadId: uploadId || undefined,
      conversationId: conversationId || undefined,
      onUpdate: (content: string) => {
        // 实时更新显示
      },
      onComplete: (content: string, newConversationId: string) => {
        const assistantMessage: Message = {
          role: 'assistant',
          content,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setConversationId(newConversationId);
      },
      onError: (errorMsg: string) => {
        setError(errorMsg);
      },
    });
  }, [isLoading, isStreaming, uploadId, conversationId, setMessages, setConversationId, sendStreamingMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, [setMessages, setConversationId]);

  const requestHint = useCallback(async (level: 'gentle' | 'moderate' | 'direct') => {
    if (!uploadId) {
      setError('需要先上传文档才能请求提示');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ApiClient.requestHint(level, uploadId, conversationId || undefined);

      const hintMessage: Message = {
        role: 'assistant',
        content: response.hint,
        timestamp: new Date().toISOString(),
        isHint: true,
      };

      setMessages(prev => [...prev, hintMessage]);
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '请求提示失败');
    } finally {
      setIsLoading(false);
    }
  }, [uploadId, conversationId, setMessages, setConversationId]);

  return {
    // State
    messages,
    isLoading: isLoading || isThinking,
    isStreaming,
    streamingContent,
    error,
    showDocument,
    sessionLoaded,
    conversationId,
    uploadId,
    fileId,
    filename,
    fileUrl,

    // Actions
    sendMessage,
    clearChat,
    requestHint,
    stopStreaming,
    setShowDocument,
    setUploadId,
    setError,
  };
}
```

---

## 🟡 P2：中优先级改进

### 任务 8: 整理文档结构

**当前问题**: 根目录有 40+ 个 markdown 文件

**执行步骤**:

```bash
# 1. 创建文档目录结构
mkdir -p docs/{guides,api,development,architecture,migration}

# 2. 移动文档到对应目录

# 指南类
mv QUICK_START_GUIDE.md docs/guides/
mv TROUBLESHOOTING_GUIDE.md docs/guides/
mv DEPLOYMENT_GUIDE.md docs/guides/

# 开发文档
mv DEVELOPMENT_PROGRESS.md docs/development/
mv TEST_COVERAGE_REPORT.md docs/development/
mv BUG_FIXES.md docs/development/

# API 文档
mv API_*.md docs/api/

# 架构文档
mv ARCHITECTURE.md docs/architecture/
mv DATABASE_SCHEMA.md docs/architecture/

# 迁移记录
mv MIGRATION_*.md docs/migration/

# 3. 创建主 README 索引
```

**新建文件**: `/docs/README.md`

```markdown
# Study Oasis 文档中心

## 📚 快速导航

### 用户指南
- [快速开始](guides/QUICK_START_GUIDE.md)
- [故障排查](guides/TROUBLESHOOTING_GUIDE.md)
- [部署指南](guides/DEPLOYMENT_GUIDE.md)

### 开发文档
- [开发进度](development/DEVELOPMENT_PROGRESS.md)
- [测试覆盖率](development/TEST_COVERAGE_REPORT.md)
- [Bug 修复记录](development/BUG_FIXES.md)

### API 文档
- [API 参考](api/)
- [接口变更记录](api/CHANGELOG.md)

### 架构设计
- [系统架构](architecture/ARCHITECTURE.md)
- [数据库设计](architecture/DATABASE_SCHEMA.md)

### 迁移记录
- [历史迁移](migration/)

---

**技术栈**: NestJS · Next.js · Prisma · PostgreSQL · Google Cloud
```

**更新根目录 README**:

**文件**: `/README.md`

```markdown
# Study Oasis

AI驱动的智能学习平台

## 快速开始

详见 [文档中心](docs/README.md)

## 项目结构

\`\`\`
study-oasis/
├── apps/
│   ├── api/          # NestJS 后端
│   └── web/          # Next.js 前端
├── packages/
│   └── contracts/    # 共享类型
└── docs/            # 📚 文档中心
\`\`\`

## 文档

- [快速开始](docs/guides/QUICK_START_GUIDE.md)
- [开发指南](docs/development/)
- [API 文档](docs/api/)
\`\`\`

---

### 任务 9: 改进错误处理

**统一错误类型定义**

**文件**: `/packages/contracts/src/errors.ts`（新建）

```typescript
export enum ErrorCode {
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // 资源错误
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',

  // 验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // 业务逻辑错误
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  OCR_FAILED = 'OCR_FAILED',
  CHAT_FAILED = 'CHAT_FAILED',

  // 系统错误
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ApiErrorResponse {
  code: ErrorCode;
  message: string;
  details?: unknown;
  timestamp: string;
  path?: string;
}
```

**更新前端错误处理**:

**文件**: `/apps/web/lib/api-client.ts`（部分修改）

```typescript
import type { ApiErrorResponse, ErrorCode } from '@study-oasis/contracts';

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: ApiErrorResponse): ApiError {
    return new ApiError(
      response.code,
      response.message,
      undefined,
      response.details
    );
  }
}

// 在 handleResponse 中使用
private static async handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiErrorResponse = await response.json();
    throw ApiError.fromResponse(error);
  }
  return response.json();
}
```

---

## 🟢 P3：低优先级优化

### 任务 10: 性能优化

#### 10.1 前端组件懒加载

**文件**: `/apps/web/app/chat/page.tsx`

```typescript
import dynamic from 'next/dynamic';

// 懒加载大型组件
const DocumentViewer = dynamic(
  () => import('./components/DocumentViewer').then(mod => mod.DocumentViewer),
  { loading: () => <div>加载中...</div> }
);

const MessageList = dynamic(
  () => import('./components/MessageList').then(mod => mod.MessageList),
  { ssr: false }
);
```

#### 10.2 数据库查询优化

**添加索引** - `/apps/api/prisma/schema.prisma`

```prisma
model Message {
  // ... 现有字段

  @@index([conversationId, createdAt])  // 提升历史消息查询性能
  @@index([createdAt])                  // 提升时间排序性能
}

model Upload {
  // ... 现有字段

  @@index([userId, createdAt])          // 提升用户文件列表查询
  @@index([createdAt])
}
```

#### 10.3 API 响应缓存

**文件**: `/apps/api/src/chat/chat.controller.ts`（添加缓存）

```typescript
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { UseInterceptors } from '@nestjs/common';

@Controller('chat')
export class ChatController {
  // 对话列表可以缓存5分钟
  @Get('conversations')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300)
  async getUserConversations(@Req() req: Request) {
    // ...
  }
}
```

---

### 任务 11: 添加 E2E 测试

**创建关键流程测试**

**文件**: `/apps/web/tests/e2e/chat-flow.spec.ts`（新建）

```typescript
import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test('should upload document and start chat', async ({ page }) => {
    await page.goto('/upload');

    // 1. 上传文档
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/sample.pdf');

    await page.click('button:has-text("上传")');

    // 等待上传完成
    await expect(page.locator('text=上传成功')).toBeVisible();

    // 2. 跳转到聊天页面
    await page.click('a:has-text("开始对话")');

    await expect(page).toHaveURL(/\/chat/);

    // 3. 发送消息
    const input = page.locator('textarea[placeholder*="输入消息"]');
    await input.fill('这个文档讲的是什么？');
    await page.click('button:has-text("发送")');

    // 4. 验证响应
    await expect(page.locator('.message.assistant')).toBeVisible({ timeout: 10000 });
  });

  test('should request hint', async ({ page }) => {
    await page.goto('/chat?fileId=test-file-id');

    // 点击提示按钮
    await page.click('button:has-text("温和提示")');

    // 验证提示消息
    await expect(page.locator('.message.hint')).toBeVisible();
  });
});
```

---

## 📝 任务执行 Checklist

### Phase 1: 稳定基础（第 1 周）
- [ ] ✅ 修复 TypeScript 测试配置（已完成）
- [ ] 修复 logging.interceptor.spec.ts 类型错误
- [ ] 修复 upload.service.spec.ts 类型错误
- [ ] 修复 upload.controller.spec.ts 类型错误
- [ ] 运行所有测试确保通过
- [ ] 清理前端 console.log（18+3+18+1 = 40 处）
- [ ] 清理后端 console.log（5 处）

### Phase 2: 重构大文件（第 2 周）
- [ ] 创建 DeepSeekService
- [ ] 创建 ConversationService
- [ ] 重构 ChatService（主服务）
- [ ] 更新 ChatModule
- [ ] 测试重构后的 chat 功能
- [ ] 创建 useChatSession hook
- [ ] 创建 useChatStreaming hook
- [ ] 重构主 useChatLogic hook
- [ ] 测试前端聊天流程

### Phase 3: 类型安全（第 3 周）
- [ ] 在 contracts 包创建 api-responses.ts
- [ ] 在 contracts 包创建 errors.ts
- [ ] 更新 contracts/index.ts 导出
- [ ] 消除 chat.service.ts 中的 any（10 处）
- [ ] 消除 upload.service.ts 中的 any（3 处）
- [ ] 消除 vision.service.ts 中的 any（10 处）
- [ ] 消除 analytics.service.ts 中的 any（8 处）
- [ ] 消除前端 useChatLogic.ts 中的 any

### Phase 4: 文档和测试（第 4 周）
- [ ] 创建 docs/ 目录结构
- [ ] 移动所有文档到对应目录
- [ ] 创建 docs/README.md 索引
- [ ] 更新根目录 README.md
- [ ] 创建 chat-flow.spec.ts E2E 测试
- [ ] 创建 upload-flow.spec.ts E2E 测试
- [ ] 运行 E2E 测试确保通过

---

## 🎯 验证脚本

在每个 Phase 完成后运行以下命令验证：

```bash
# Phase 1 验证
cd apps/api
npm test                          # 所有测试通过
npm run lint                      # 无 lint 错误

# Phase 2 验证
cd apps/api
npm test src/chat/                # Chat 模块测试通过
cd ../../apps/web
npm run build                     # 前端构建成功

# Phase 3 验证
cd apps/api
npm run build                     # TypeScript 编译无错误
grep -r "any" src/ --include="*.ts" | wc -l  # any 使用减少

# Phase 4 验证
cd apps/web
npm run test:e2e                  # E2E 测试通过
```

---

## 📊 预期改进效果

| 指标 | 当前 | 目标 | 改进 |
|------|------|------|------|
| 测试通过率 | 0% | 100% | ✅ |
| 代码规范得分 | 6/10 | 8.5/10 | +42% |
| 最大文件行数 | 799 | <300 | -62% |
| any 类型使用 | 110 | <20 | -82% |
| console.log 数量 | 115 | <10 | -91% |
| 文档组织性 | 混乱 | 清晰 | ✅ |

---

## 🤖 AI 助手执行建议

### 推荐执行顺序
1. **先修复阻塞性问题**（任务 2-4）- 让测试跑起来
2. **按模块清理代码**（任务 5-6）- 逐个文件处理
3. **重构大文件**（任务 7）- 一次重构一个服务
4. **完善类型系统**（任务 8）- 从 contracts 开始
5. **整理文档**（任务 9）- 批量移动文件
6. **添加测试**（任务 10-11）- 确保功能正常

### 执行建议
- **每完成一个任务立即提交 git**，避免代码丢失
- **重构时保持测试通过**，出问题立即回滚
- **大文件拆分要谨慎**，一次只拆一个
- **类型修复从外向内**，先 contracts 后业务代码

---

**预计总工作量**: 20-30 小时
**预计完成时间**: 3-4 周（每周 6-8 小时）
**代码质量提升**: 6.5/10 → 8.5/10

Happy coding! 🚀
