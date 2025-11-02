# Study Oasis 代码改进计划

> 生成日期：2025-11-01
> 基于代码质量分析报告
> 当前评分：6.4/10（一般水平）
> 目标评分：8.0/10（良好水平）

---

## 📊 项目当前状态

### 整体评价
- ✅ **架构清晰**：Monorepo 结构合理，前后端分离明确
- ✅ **技术栈现代**：NestJS + Next.js + TypeScript
- ⚠️ **功能不完整**：聊天功能只有硬编码回复
- ❌ **测试覆盖不足**：Web 端完全缺失 E2E 测试
- ⚠️ **代码标准化欠佳**：存在冗余、不一致问题

### 各维度评分

| 维度 | 当前评分 | 目标评分 | 差距 |
|------|----------|----------|------|
| 项目架构 | 7/10 | 8/10 | 包复用度提升 |
| 代码质量 | 6/10 | 8/10 | 消除技术债 |
| 类型安全 | 8/10 | 9/10 | 统一类型定义 |
| 测试覆盖 | 5/10 | 8/10 | 补充 Web 端测试 |
| 安全性 | 7/10 | 8/10 | 强化配置 |
| 文档 | 5/10 | 7/10 | 组织和标准化 |

---

## 🎯 改进任务清单

改进任务分为 **4 个阶段**，按优先级和依赖关系组织：

---

## Phase 2.5.3: 前端状态持久化 ✅（已在 TODO 中）

### 任务描述
完善前端 localStorage 存储机制，添加数据管理和过期机制。

### 具体改进项

#### 2.5.3.1 增强 storage.ts 功能
**文件**: `apps/web/lib/storage.ts`

**问题**:
- 缺少数据过期机制
- 硬编码限制（50 条记录）
- 无容量管理

**改进任务**:
```typescript
// 1. 添加数据过期接口
interface StorageItem<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

// 2. 实现过期清理
static cleanExpired(): void {
  // 遍历所有 key，清理过期数据
}

// 3. 添加容量检查
static checkCapacity(): { used: number; available: number } {
  // 检查 localStorage 使用情况
}

// 4. 配置化限制
const CONFIG = {
  maxUploadRecords: 50,
  maxChatHistory: 100,
  defaultExpiry: 7 * 24 * 60 * 60 * 1000, // 7 天
};
```

**验收标准**:
- [ ] 添加数据过期机制
- [ ] 实现自动清理过期数据
- [ ] 配置可通过环境变量调整
- [ ] 添加容量监控方法
- [ ] 补充单元测试（覆盖率 > 80%）

---

## Phase 2.5.4: Swagger API 文档 ✅（已在 TODO 中）

### 任务描述
为 API 添加完整的 Swagger/OpenAPI 文档。

### 具体改进项

#### 2.5.4.1 集成 Swagger
**文件**: `apps/api/src/main.ts`, `apps/api/package.json`

**改进任务**:
```typescript
// 1. 安装依赖
// pnpm add @nestjs/swagger swagger-ui-express

// 2. 在 main.ts 中配置
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Study Oasis API')
  .setDescription('AI 学习助手 API 文档')
  .setVersion('1.0')
  .addTag('chat', '聊天相关接口')
  .addTag('upload', '文件上传接口')
  .addTag('health', '健康检查接口')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
```

#### 2.5.4.2 为所有 DTO 添加装饰器
**文件**: `apps/api/src/chat/dto/*.ts`, `apps/api/src/upload/*.ts`

**改进任务**:
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({
    description: '用户消息内容',
    example: '请解释一下什么是递归？',
  })
  message: string;

  @ApiProperty({
    description: '提示级别：1-直接答案, 2-提示, 3-引导',
    enum: [1, 2, 3],
    default: 2,
  })
  hintLevel?: number;

  // ... 其他字段
}
```

#### 2.5.4.3 为所有 Controller 添加文档
**文件**: `apps/api/src/**/*.controller.ts`

**改进任务**:
```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  @Post('message')
  @ApiOperation({ summary: '发送聊天消息' })
  @ApiResponse({
    status: 200,
    description: '返回 AI 回复',
    type: ChatResponse,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  async sendMessage(@Body() dto: ChatRequestDto) {
    // ...
  }
}
```

**验收标准**:
- [ ] Swagger UI 可访问（http://localhost:3001/api-docs）
- [ ] 所有 DTO 有完整的 @ApiProperty
- [ ] 所有接口有 @ApiOperation 和 @ApiResponse
- [ ] 支持在 Swagger UI 中测试接口
- [ ] 生成的文档可导出为 JSON/YAML

---

## Phase 3: AI 集成 ✅（已在 TODO 中）

### 任务描述
实现真实的 AI API 集成，替换当前的硬编码回复。

### 具体改进项

#### 3.1 选择 AI 服务商
**选项**:
1. **OpenAI API** (推荐)
   - 优势：文档完善，模型质量高
   - 成本：$0.002/1K tokens (GPT-3.5)

2. **Azure OpenAI**
   - 优势：企业级，数据隐私保护
   - 成本：按使用量计费

3. **本地模型** (Ollama)
   - 优势：免费，数据私有
   - 缺点：需要本地算力

**建议**: 从 OpenAI API 开始，后续可切换

#### 3.2 创建 AI 服务模块
**新建文件**: `apps/api/src/ai/ai.module.ts`, `ai.service.ts`

**改进任务**:
```typescript
// ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('ai.apiKey'),
    });
  }

  async generateResponse(
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    hintLevel: number,
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(hintLevel);

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  }

  private buildSystemPrompt(hintLevel: number): string {
    const prompts = {
      1: '你是一个学习助手，直接、清晰地回答问题。',
      2: '你是一个学习助手，通过提示引导学生思考，但不直接给出答案。',
      3: '你是一个学习助手，通过苏格拉底式提问引导学生自己找到答案。',
    };
    return prompts[hintLevel] || prompts[2];
  }
}
```

#### 3.3 更新 ChatService
**文件**: `apps/api/src/chat/chat.service.ts`

**改进任务**:
```typescript
// 替换硬编码逻辑
@Injectable()
export class ChatService {
  constructor(
    private aiService: AiService,  // 注入 AI 服务
    private loggerService: LoggerService,
    private configService: ConfigService,
  ) {}

  async sendMessage(dto: ChatRequestDto): Promise<ChatResponse> {
    try {
      // 调用 AI 服务
      const reply = await this.aiService.generateResponse(
        dto.message,
        dto.conversationHistory || [],
        dto.hintLevel || 2,
      );

      return {
        message: reply,
        success: true,
      };
    } catch (error) {
      this.loggerService.error('AI API 调用失败', {
        error: error.message,
        message: dto.message,
      });

      // 降级处理
      return {
        message: '抱歉，AI 服务暂时不可用，请稍后再试。',
        success: false,
      };
    }
  }
}
```

#### 3.4 添加配置
**文件**: `apps/api/src/config/configuration.ts`

**改进任务**:
```typescript
export default () => ({
  // ... 现有配置
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '500', 10),
  },
});
```

**环境变量**: `.env.example`
```bash
# AI Configuration
AI_PROVIDER=openai
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=500
```

#### 3.5 添加测试
**文件**: `apps/api/src/ai/ai.service.spec.ts`

**改进任务**:
```typescript
describe('AiService', () => {
  it('应该能生成 AI 回复', async () => {
    const reply = await service.generateResponse(
      '什么是递归？',
      [],
      2,
    );

    expect(reply).toBeDefined();
    expect(typeof reply).toBe('string');
  });

  it('应该根据 hintLevel 使用不同的 prompt', async () => {
    // 测试不同的 hintLevel
  });

  it('应该处理 API 错误', async () => {
    // Mock API 错误
  });
});
```

**验收标准**:
- [ ] AI 服务模块创建完成
- [ ] ChatService 集成 AI 服务
- [ ] 配置文件和环境变量完善
- [ ] 单元测试覆盖率 > 80%
- [ ] E2E 测试更新，验证真实 AI 响应
- [ ] 添加错误降级处理
- [ ] 添加 API 调用速率限制
- [ ] 添加 token 使用量监控

---

## Phase 4: 代码质量提升（高优先级）

### 任务描述
解决代码质量分析中发现的关键问题。

### 具体改进项

#### 4.1 统一错误响应格式
**新建文件**: `apps/api/src/common/exceptions/business-exception.ts`

**问题**:
- API 各处抛出的异常格式不一致
- 缺少统一的错误码体系

**改进任务**:
```typescript
// 1. 创建错误码枚举
export enum ErrorCode {
  // 通用错误 (1000-1999)
  INTERNAL_ERROR = 1000,
  VALIDATION_ERROR = 1001,
  NOT_FOUND = 1002,

  // 文件上传错误 (2000-2999)
  FILE_TOO_LARGE = 2000,
  FILE_TYPE_NOT_ALLOWED = 2001,
  FILE_VALIDATION_FAILED = 2002,

  // 聊天错误 (3000-3999)
  AI_SERVICE_UNAVAILABLE = 3000,
  INVALID_HINT_LEVEL = 3001,
  MESSAGE_TOO_LONG = 3002,
}

// 2. 创建业务异常类
export class BusinessException extends HttpException {
  constructor(
    public readonly errorCode: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        errorCode,
        message,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}

// 3. 创建具体异常类
export class FileTooLargeException extends BusinessException {
  constructor(maxSize: number) {
    super(
      ErrorCode.FILE_TOO_LARGE,
      `文件大小超过限制。最大允许: ${maxSize}MB`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class FileTypeNotAllowedException extends BusinessException {
  constructor(fileType: string) {
    super(
      ErrorCode.FILE_TYPE_NOT_ALLOWED,
      `不支持的文件类型: ${fileType}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}
```

#### 4.2 更新异常过滤器
**文件**: `apps/api/src/common/filters/all-exceptions.filter.ts`

**改进任务**:
```typescript
// 识别 BusinessException 并格式化
if (exception instanceof BusinessException) {
  response.status(status).json({
    success: false,
    errorCode: exception.errorCode,
    message: exception.message,
    timestamp: new Date().toISOString(),
    path: request.url,
  });
} else {
  // 其他异常的处理
}
```

#### 4.3 替换所有 throw 语句
**文件**: `apps/api/src/upload/upload.service.ts`, `chat/chat.service.ts` 等

**改进任务**:
```typescript
// 之前:
throw new BadRequestException(`文件大小超过限制。最大允许: ${maxSizeMB}MB`);

// 之后:
throw new FileTooLargeException(maxSizeMB);
```

**验收标准**:
- [ ] 创建完整的错误码枚举（100+ 错误码）
- [ ] 创建业务异常基类
- [ ] 为每个业务场景创建具体异常类
- [ ] 更新所有 Service 使用新的异常类
- [ ] 更新异常过滤器处理新格式
- [ ] 更新前端 API 客户端识别新错误格式
- [ ] 添加异常类的单元测试
- [ ] 更新 Swagger 文档显示错误响应

---

## Phase 5: Web 端测试补充（高优先级）

### 任务描述
补充 Web 端缺失的测试，提高测试覆盖率。

### 具体改进项

#### 5.1 安装 E2E 测试框架
**文件**: `apps/web/package.json`

**改进任务**:
```bash
# 安装 Playwright
pnpm add -D @playwright/test

# 初始化
pnpm dlx playwright install
```

**配置**: `apps/web/playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### 5.2 创建 E2E 测试
**新建文件**: `apps/web/e2e/upload.spec.ts`

**改进任务**:
```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('文件上传流程', () => {
  test('应该能成功上传 PDF 文件', async ({ page }) => {
    await page.goto('/upload');

    // 选择文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(__dirname, 'fixtures', 'test.pdf')
    );

    // 点击上传
    await page.click('button:has-text("上传文件")');

    // 验证成功消息
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page.locator('.success-message'))
      .toContainText('上传成功');
  });

  test('应该拒绝不支持的文件类型', async ({ page }) => {
    await page.goto('/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(__dirname, 'fixtures', 'test.exe')
    );

    // 验证错误消息
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('.error-message'))
      .toContainText('不支持的文件类型');
  });

  test('应该显示上传历史', async ({ page }) => {
    // 先上传一个文件
    await page.goto('/upload');
    // ... 上传逻辑

    // 刷新页面
    await page.reload();

    // 验证历史记录存在
    await expect(page.locator('.upload-history')).toBeVisible();
    await expect(page.locator('.upload-history-item')).toHaveCount(1);
  });
});
```

**新建文件**: `apps/web/e2e/chat.spec.ts`

**改进任务**:
```typescript
test.describe('聊天功能', () => {
  test('应该能发送消息并收到回复', async ({ page }) => {
    await page.goto('/chat');

    // 输入消息
    await page.fill('textarea[name="message"]', '什么是递归？');

    // 选择提示级别
    await page.selectOption('select[name="hintLevel"]', '2');

    // 发送
    await page.click('button:has-text("发送")');

    // 等待回复
    await page.waitForSelector('.message.assistant', { timeout: 5000 });

    // 验证消息显示
    expect(await page.locator('.message.user').textContent())
      .toContain('什么是递归？');
    expect(await page.locator('.message.assistant').textContent())
      .not.toBe('');
  });

  test('应该保持对话历史', async ({ page }) => {
    await page.goto('/chat');

    // 发送第一条消息
    await page.fill('textarea', '你好');
    await page.click('button:has-text("发送")');
    await page.waitForSelector('.message.assistant');

    // 发送第二条消息
    await page.fill('textarea', '我的上一个问题是什么？');
    await page.click('button:has-text("发送")');
    await page.waitForSelector('.message.assistant:nth-of-type(2)');

    // 验证有 4 条消息（2 用户 + 2 助手）
    expect(await page.locator('.message').count()).toBe(4);
  });

  test('应该能清除对话历史', async ({ page }) => {
    await page.goto('/chat');

    // 发送消息
    await page.fill('textarea', '测试消息');
    await page.click('button:has-text("发送")');
    await page.waitForSelector('.message');

    // 点击清除
    await page.click('button:has-text("清除对话")');

    // 验证消息已清除
    expect(await page.locator('.message').count()).toBe(0);
  });
});
```

#### 5.3 补充单元测试
**新建文件**: `apps/web/lib/__tests__/api-client.test.ts`

**改进任务**:
```typescript
import { ApiClient } from '../api-client';

describe('ApiClient', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('应该正确发送 POST 请求', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: 'test' }),
    });

    const result = await ApiClient.post('/test', { foo: 'bar' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ foo: 'bar' }),
      })
    );
    expect(result).toEqual({ data: 'test' });
  });

  it('应该处理网络错误', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    await expect(ApiClient.post('/test', {}))
      .rejects.toThrow('Network error');
  });

  it('应该处理 HTTP 错误响应', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad request' }),
    });

    await expect(ApiClient.post('/test', {}))
      .rejects.toThrow();
  });
});
```

**新建文件**: `apps/web/lib/__tests__/storage.test.ts`（补充现有测试）

**改进任务**:
```typescript
// 补充覆盖的场景
describe('Storage - 边界情况', () => {
  it('应该处理 localStorage 不可用的情况', () => {
    const originalLocalStorage = global.localStorage;
    delete (global as any).localStorage;

    expect(() => Storage.saveUpload({} as any)).not.toThrow();

    global.localStorage = originalLocalStorage;
  });

  it('应该限制上传记录数量', () => {
    // 添加 51 条记录
    for (let i = 0; i < 51; i++) {
      Storage.saveUpload({
        fileId: `file-${i}`,
        fileName: `test-${i}.pdf`,
        uploadedAt: new Date().toISOString(),
      });
    }

    const history = Storage.getUploadHistory();
    expect(history.length).toBe(50);
  });

  it('应该正确清理过期数据', () => {
    // 测试过期清理逻辑（如果实现了）
  });
});
```

#### 5.4 添加测试脚本
**文件**: `apps/web/package.json`

**改进任务**:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

**验收标准**:
- [ ] Playwright 配置完成
- [ ] 上传流程 E2E 测试（3+ 场景）
- [ ] 聊天流程 E2E 测试（3+ 场景）
- [ ] 主页导航 E2E 测试
- [ ] API 客户端单元测试（覆盖率 > 80%）
- [ ] Storage 单元测试（覆盖率 > 80%）
- [ ] 页面组件单元测试（至少 3 个主要组件）
- [ ] 所有测试通过 CI
- [ ] 测试报告自动生成

---

## Phase 6: 代码重构（中优先级）

### 任务描述
重构大型组件，提高代码可维护性。

### 具体改进项

#### 6.1 重构上传页面
**文件**: `apps/web/app/upload/page.tsx` (282 行 → 目标 < 150 行)

**问题**:
- 状态管理和 UI 逻辑混在一起
- 文件验证逻辑在组件内部
- 没有抽取可复用的 hooks

**改进任务**:

**步骤 1**: 创建自定义 Hook
**新建文件**: `apps/web/app/upload/hooks/useFileUpload.ts`

```typescript
import { useState, useCallback } from 'react';
import { ApiClient } from '@/lib/api-client';
import { Storage } from '@/lib/storage';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'text/plain',
    ];

    if (file.size > maxSize) {
      throw new Error('文件大小不能超过 10MB');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('不支持的文件类型');
    }
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      validateFile(file);

      const formData = new FormData();
      formData.append('file', file);

      const result = await ApiClient.uploadFile('/upload', formData, {
        onProgress: setProgress,
      });

      // 保存到历史
      Storage.saveUpload({
        fileId: result.fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
      });

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
      throw err;
    } finally {
      setUploading(false);
    }
  }, [validateFile]);

  return {
    uploading,
    progress,
    error,
    uploadFile,
  };
}
```

**步骤 2**: 提取组件
**新建文件**: `apps/web/app/upload/components/FileDropzone.tsx`

```typescript
interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelect, disabled }: FileDropzoneProps) {
  // 拖拽上传逻辑
  // 点击选择逻辑
  // 预览逻辑
}
```

**新建文件**: `apps/web/app/upload/components/UploadProgress.tsx`

```typescript
interface UploadProgressProps {
  progress: number;
  fileName: string;
}

export function UploadProgress({ progress, fileName }: UploadProgressProps) {
  // 进度条显示逻辑
}
```

**新建文件**: `apps/web/app/upload/components/UploadHistory.tsx`

```typescript
export function UploadHistory() {
  const [history, setHistory] = useState(Storage.getUploadHistory());

  // 历史记录显示和管理逻辑
}
```

**步骤 3**: 简化主页面
**文件**: `apps/web/app/upload/page.tsx`

```typescript
'use client';

import { FileDropzone } from './components/FileDropzone';
import { UploadProgress } from './components/UploadProgress';
import { UploadHistory } from './components/UploadHistory';
import { useFileUpload } from './hooks/useFileUpload';

export default function UploadPage() {
  const { uploading, progress, error, uploadFile } = useFileUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadFile(selectedFile);
      setSelectedFile(null);
      // 显示成功提示
    } catch (err) {
      // 错误已在 hook 中处理
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1>上传文件</h1>

      <FileDropzone
        onFileSelect={handleFileSelect}
        disabled={uploading}
      />

      {uploading && (
        <UploadProgress
          progress={progress}
          fileName={selectedFile?.name || ''}
        />
      )}

      {error && <ErrorMessage message={error} />}

      <UploadHistory />
    </div>
  );
}
```

#### 6.2 重构聊天页面
**文件**: `apps/web/app/chat/page.tsx` (235 行 → 目标 < 120 行)

**改进任务**:

**步骤 1**: 创建自定义 Hook
**新建文件**: `apps/web/app/chat/hooks/useChat.ts`

```typescript
export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    hintLevel: number,
  ) => {
    // 发送消息逻辑
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    Storage.clearChatHistory();
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearHistory,
  };
}
```

**步骤 2**: 简化主页面（使用已有组件）

```typescript
export default function ChatPage() {
  const { messages, loading, error, sendMessage, clearHistory } = useChat();

  return (
    <div>
      <MessageList messages={messages} />
      <MessageInput
        onSend={sendMessage}
        disabled={loading}
      />
      {error && <ErrorMessage message={error} />}
    </div>
  );
}
```

#### 6.3 重构 Settings 页面
**文件**: `apps/web/app/settings/page.tsx` (321 行 → 目标 < 150 行)

**改进任务**:
- 提取 `useSettings` hook
- 创建独立的设置项组件
- 分离表单验证逻辑

**验收标准**:
- [ ] upload/page.tsx < 150 行
- [ ] chat/page.tsx < 120 行
- [ ] settings/page.tsx < 150 行
- [ ] 至少创建 3 个可复用 hooks
- [ ] 至少提取 5 个可复用组件
- [ ] 所有重构代码有单元测试
- [ ] E2E 测试仍然通过

---

## Phase 7: 类型定义统一（中优先级）

### 任务描述
统一类型定义，消除重复。

### 具体改进项

#### 7.1 迁移到 packages/contracts
**文件**: `packages/contracts/src/index.ts`

**问题**:
- `apps/api/src/chat/chat.types.ts` 和 `packages/contracts/src/chat.ts` 重复
- Web 端自定义类型未共享
- 响应类型不统一

**改进任务**:

**步骤 1**: 完善共享类型
```typescript
// packages/contracts/src/chat.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  hintLevel?: 1 | 2 | 3;
  conversationHistory?: Message[];
}

export interface ChatResponse {
  message: string;
  success: boolean;
  error?: string;
}

// packages/contracts/src/upload.ts
export interface UploadRecord {
  fileId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

export interface UploadResponse {
  success: boolean;
  fileId?: string;
  fileName?: string;
  message?: string;
  error?: string;
}

// packages/contracts/src/common.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: string;
}

export interface ApiError {
  errorCode: number;
  message: string;
  details?: any;
}
```

**步骤 2**: 更新 API 使用共享类型
```typescript
// apps/api/src/chat/chat.types.ts 删除
// apps/api/src/chat/chat.controller.ts
import { ChatRequest, ChatResponse } from '@study-oasis/contracts';
```

**步骤 3**: 更新 Web 使用共享类型
```typescript
// apps/web/app/chat/page.tsx
import { Message, ChatRequest, ChatResponse } from '@study-oasis/contracts';
```

**验收标准**:
- [ ] 删除所有重复的类型定义
- [ ] API 和 Web 都使用 @study-oasis/contracts
- [ ] 统一 API 响应格式为 ApiResponse<T>
- [ ] 所有接口使用共享类型
- [ ] TypeScript 编译无错误
- [ ] 测试全部通过

---

## Phase 8: 安全增强（中优先级）

### 任务描述
强化安全配置，消除安全隐患。

### 具体改进项

#### 8.1 强化 CORS 配置
**文件**: `apps/api/src/main.ts`

**问题**:
- CORS 配置过于宽松
- 缺少白名单验证

**改进任务**:
```typescript
// 1. 创建 CORS 白名单
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.WEB_ORIGIN,
].filter(Boolean);

// 2. 动态 CORS 验证
app.enableCors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如 Postman）在开发环境
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
});
```

#### 8.2 添加 HTTPS 重定向
**文件**: `apps/api/src/main.ts`

**改进任务**:
```typescript
// 生产环境强制 HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(307, `https://${req.get('host')}${req.originalUrl}`);
    }
    next();
  });
}
```

#### 8.3 添加安全响应头
**文件**: `apps/api/src/main.ts`

**改进任务**:
```bash
# 安装 helmet
pnpm add helmet
```

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

#### 8.4 添加请求日志审计
**文件**: `apps/api/src/common/interceptors/audit.interceptor.ts`

**改进任务**:
```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private loggerService: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;

    this.loggerService.log('info', 'API Request', {
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      timestamp: new Date().toISOString(),
    });

    return next.handle();
  }
}
```

#### 8.5 添加敏感数据脱敏
**文件**: `apps/api/src/common/logger/sanitizer.ts`

**改进任务**:
```typescript
export function sanitizeLogData(data: any): any {
  const sensitiveKeys = [
    'password',
    'apiKey',
    'token',
    'secret',
    'authorization',
  ];

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data };

  for (const key in sanitized) {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}
```

**验收标准**:
- [ ] CORS 白名单验证实现
- [ ] HTTPS 重定向（生产环境）
- [ ] Helmet 安全头配置
- [ ] 请求审计日志
- [ ] 敏感数据脱敏
- [ ] 通过安全扫描（npm audit）
- [ ] 通过 OWASP 基础检查

---

## Phase 9: 性能优化（低优先级）

### 任务描述
优化性能瓶颈。

### 具体改进项

#### 9.1 优化文件处理
**文件**: `apps/api/src/upload/upload.service.ts`

**问题**: 大文件完全加载到内存

**改进任务**:
```typescript
// 使用流式处理
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

async saveFile(file: Express.Multer.File): Promise<string> {
  const uploadPath = this.getUploadPath(file.filename);

  // 使用流
  const writeStream = createWriteStream(uploadPath);
  await pipeline(file.stream, writeStream);

  return uploadPath;
}
```

#### 9.2 添加响应缓存
**文件**: `apps/api/src/common/decorators/cache.decorator.ts`

**改进任务**:
```typescript
export const CacheResponse = (ttl: number = 60) =>
  SetMetadata('cache_ttl', ttl);

// 在 Controller 中使用
@Get('health')
@CacheResponse(300) // 缓存 5 分钟
async getHealth() {
  return this.healthService.check();
}
```

#### 9.3 Web 端虚拟滚动
**文件**: `apps/web/app/chat/components/MessageList.tsx`

**改进任务**:
```bash
pnpm add react-window
```

```typescript
import { FixedSizeList } from 'react-window';

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={100}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <MessageBubble message={messages[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

**验收标准**:
- [ ] 文件处理使用流
- [ ] 响应缓存实现
- [ ] 长列表虚拟滚动
- [ ] 图片懒加载
- [ ] 性能测试通过（Lighthouse > 90）

---

## Phase 10: 文档整理（低优先级）

### 任务描述
整理和标准化项目文档。

### 具体改进项

#### 10.1 创建统一 README
**新建文件**: `README.md`

**内容结构**:
```markdown
# Study Oasis - AI 学习助手

## 项目简介
...

## 技术栈
- 后端: NestJS + TypeScript
- 前端: Next.js + React + Tailwind CSS
- 测试: Jest + Playwright

## 快速开始

### 环境要求
- Node.js >= 18
- pnpm >= 8

### 安装依赖
\`\`\`bash
pnpm install
\`\`\`

### 配置环境变量
\`\`\`bash
cp .env.example .env
# 编辑 .env 文件
\`\`\`

### 启动开发服务器
\`\`\`bash
pnpm dev
\`\`\`

## 项目结构
...

## 部署
...

## 贡献指南
...
```

#### 10.2 整理历史文档
**改进任务**:
```bash
# 创建 docs 目录
mkdir -p docs/{phases,tasks,guides}

# 移动文档
mv PHASE_*.md docs/phases/
mv TASK_*.md docs/tasks/
mv TESTING_TODO.md docs/guides/
```

#### 10.3 创建 API 文档
- Swagger UI 已在 Phase 2.5.4 完成
- 补充 README 说明如何访问

**验收标准**:
- [ ] 根目录 README.md 完整
- [ ] 文档分类整理到 docs/
- [ ] API 文档可访问
- [ ] 贡献指南编写完成

---

## 📈 验收标准总结

### 最终目标

完成所有改进后，项目应达到以下标准：

#### 代码质量
- [ ] TypeScript 严格模式，无 any 类型（除必要情况）
- [ ] ESLint 零警告
- [ ] 所有函数和类有 JSDoc 注释
- [ ] 代码复杂度 < 10（使用 complexity 插件）

#### 测试覆盖
- [ ] API 单元测试覆盖率 > 80%
- [ ] Web 单元测试覆盖率 > 60%
- [ ] API E2E 测试覆盖核心流程
- [ ] Web E2E 测试覆盖核心流程
- [ ] 所有测试通过 CI

#### 功能完整性
- [ ] AI 集成完成，能正常对话
- [ ] 文件上传功能完整，支持多种格式
- [ ] 前端状态持久化，刷新不丢失
- [ ] 错误处理完善，用户体验良好

#### 性能
- [ ] API 响应时间 < 500ms (p95)
- [ ] Web Lighthouse 分数 > 90
- [ ] 大文件上传使用流处理
- [ ] 长列表使用虚拟滚动

#### 安全
- [ ] CORS 白名单验证
- [ ] HTTPS 强制（生产环境）
- [ ] 安全响应头（Helmet）
- [ ] 敏感数据脱敏
- [ ] npm audit 零高危漏洞

#### 文档
- [ ] README 完整
- [ ] API 文档可访问
- [ ] 代码有充分注释
- [ ] 贡献指南完善

---

## 🚀 执行建议

### 建议顺序

1. **Week 1-2**: Phase 2.5.3, 2.5.4 (已在 TODO)
2. **Week 3-4**: Phase 3 (AI 集成 - 已在 TODO)
3. **Week 5-6**: Phase 4, 5 (错误标准化 + Web 测试)
4. **Week 7-8**: Phase 6 (代码重构)
5. **Week 9+**: Phase 7, 8, 9, 10 (类型统一、安全、性能、文档)

### 并行任务

可以同时进行的任务：
- Phase 2.5.3 (前端) + Phase 2.5.4 (后端)
- Phase 4 (错误处理) + Phase 5.1-5.2 (测试框架)
- Phase 6.1 (Upload 重构) + Phase 6.2 (Chat 重构)

### 风险控制

每个 Phase 完成后：
1. 运行完整测试套件
2. 验证所有功能仍正常工作
3. 提交 Git commit（清晰的 commit message）
4. 更新 TODO 列表

---

## 📝 进度追踪

建议使用 GitHub Projects 或类似工具追踪进度：

- [ ] Phase 2.5.3: 前端状态持久化
- [ ] Phase 2.5.4: Swagger API 文档
- [ ] Phase 3: AI 集成
- [ ] Phase 4: 错误响应统一
- [ ] Phase 5: Web 端测试补充
- [ ] Phase 6: 代码重构
- [ ] Phase 7: 类型定义统一
- [ ] Phase 8: 安全增强
- [ ] Phase 9: 性能优化
- [ ] Phase 10: 文档整理

---

## 💡 额外建议

### 持续改进
- 每周 code review
- 定期依赖更新 (renovate bot)
- 定期性能监控
- 定期安全扫描

### 工具推荐
- **代码质量**: SonarQube
- **性能监控**: Lighthouse CI
- **依赖管理**: Renovate
- **安全扫描**: Snyk

---

**预计总工时**: 80-100 小时
**预计完成时间**: 10-12 周（兼职）或 4-6 周（全职）

祝改进顺利！🎉
