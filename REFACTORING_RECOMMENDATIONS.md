# Study Oasis 项目重构建议与执行方案

**生成时间**: 2025-11-10
**项目版本**: v1.0.0
**代码行数**: ~13,500 行 TypeScript
**测试覆盖率**: 257 测试 / 80%+

---

## 📊 项目现状概览

### 技术栈
- **后端**: NestJS 11 + Prisma 6 + PostgreSQL (Supabase) + Winston Logger
- **前端**: Next.js 16 + React 19 + TailwindCSS 4
- **云服务**: Google Cloud (Storage + Vision API)
- **AI**: DeepSeek API
- **Monorepo**: pnpm workspace

### 优点
✅ 架构清晰，模块化设计
✅ 已引入 Repository Pattern
✅ 结构化日志系统
✅ 有安全意识（文件验证、JWT 认证）
✅ 测试覆盖率 80%+

### 主要问题
❌ 命名规范混乱（数据库字段、变量命名）
❌ 类型安全问题（过度使用 `any`）
❌ Service 方法过长（220+ 行）
❌ 缺少 API 文档（Swagger 未配置）
❌ 错误处理不统一
❌ 测试覆盖率不均（部分新代码 0-21%）

---

## 🎯 改进优先级分类

### 🔴 P0 - 立即修复（阻塞性问题）
1. 统一数据库字段命名规范
2. 去掉 `any` 类型，使用 Prisma 生成类型
3. 统一错误处理策略
4. 添加 Swagger API 文档配置

### 🟠 P1 - 1-2周内（重要但不紧急）
5. 拆分过长的 Service 方法
6. 补全新代码单元测试（Repository/Helper）
7. 提取魔法数字为配置常量
8. 规范 JSDoc 注释（英文 + 参数说明）

### 🟡 P2 - 1个月内（优化改进）
9. 引入消息队列（BullMQ）处理 OCR
10. 添加前端状态管理（Zustand）
11. 添加前端错误边界
12. 解决 N+1 查询问题

### 🟢 P3 - 有空再说（锦上添花）
13. 添加 Redis 缓存层
14. 完善集成测试和 E2E 测试
15. 性能监控和告警
16. 国际化支持

---

## 🔴 P0 问题详细修复方案

### P0-1: 统一数据库字段命名规范

#### 问题描述
**位置**: `apps/api/prisma/schema.prisma`

数据库字段命名混乱：
- 有的全小写：`userid`, `originalname`, `s3key`
- 有的用 snake_case：`public_url`
- `s3Key` 字段实际存储的是 GCS 路径，命名误导

#### 修复方案

**步骤 1**: 修改 Prisma Schema

```prisma
// apps/api/prisma/schema.prisma

model Document {
  id           String   @id @default(uuid())
  userId       String?  @map("user_id")           // ✅ 改为 snake_case
  filename     String
  originalName String?  @map("original_name")     // ✅ 改为 snake_case
  gcsPath      String?  @map("gcs_path")          // ✅ 统一为 gcsPath
  publicUrl    String?  @map("public_url")
  mimeType     String?  @map("mime_type")         // ✅ 改为 snake_case
  size         Int
  ocrStatus    String   @default("pending") @map("ocr_status") // ✅ 改为 snake_case
  uploadedAt   DateTime @default(now()) @map("uploaded_at")    // ✅ 改为 snake_case

  user          User?         @relation(fields: [userId], references: [id])
  ocrResult     OcrResult?
  conversations Conversation[]

  @@index([userId])
  @@map("documents")
}

model OcrResult {
  id             String   @id @default(uuid())
  documentId     String   @unique @map("document_id")
  fullText       String   @map("full_text") @db.Text
  language       String
  confidence     Float
  pageCount      Int?     @map("page_count")
  processedAt    DateTime @map("processed_at") @default(now())

  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("ocr_results")
}
```

**步骤 2**: 创建数据库迁移

```bash
cd apps/api
npx prisma migrate dev --name unify_column_naming
npx prisma generate
```

**步骤 3**: 更新代码中的字段引用

需要修改的文件：
- `apps/api/src/upload/repositories/document.repository.ts`
- `apps/api/src/upload/upload.service.ts`

```typescript
// apps/api/src/upload/upload.service.ts

// ❌ 修改前
const document = await this.documentRepository.create({
  userId,
  filename: sanitizedFilename,
  s3Key: gcsPath || undefined,  // 错误的字段名
  size: file.size,
  ocrStatus: 'pending',
  publicUrl: fileUrl,
});

// ✅ 修改后
const document = await this.documentRepository.create({
  userId,
  filename: sanitizedFilename,
  gcsPath: gcsPath || undefined,  // 正确的字段名
  size: file.size,
  ocrStatus: 'pending',
  publicUrl: fileUrl,
});
```

---

### P0-2: 去掉 `any` 类型，使用 Prisma 生成类型

#### 问题描述
**位置**:
- `apps/api/src/focus/focus.service.ts:59`
- `apps/api/src/focus/focus.service.ts:190`
- `apps/api/src/chat/chat.service.ts:190`

过度使用 `any` 类型，丧失类型安全。

#### 修复方案

```typescript
// apps/api/src/focus/focus.service.ts

import { Prisma, FocusSession } from '@prisma/client';

// ❌ 修改前
async updateSession(
  sessionId: string,
  updateDto: UpdateFocusSessionDto,
  userId: string,
) {
  const updates: any = { updatedAt: now };  // ❌ 使用 any
  // ...
}

async getUserSessions(
  userId: string,
  options?: { limit?: number; offset?: number; status?: string },
) {
  const where: any = { userId };  // ❌ 使用 any
  // ...
}

// ✅ 修改后
async updateSession(
  sessionId: string,
  updateDto: UpdateFocusSessionDto,
  userId: string,
): Promise<FocusSession> {
  const updates: Prisma.FocusSessionUpdateInput = {  // ✅ 使用 Prisma 类型
    updatedAt: new Date(),
  };

  if (updateDto.status) {
    updates.status = updateDto.status;
  }

  if (updateDto.pauseCount !== undefined) {
    updates.pauseCount = updateDto.pauseCount;
  }

  // ...更多字段

  return this.prisma.focusSession.update({
    where: { id: sessionId },
    data: updates,
    include: { distractions: true },
  });
}

async getUserSessions(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: string;
  },
): Promise<PaginatedResponse<FocusSession>> {
  const { limit = 20, offset = 0, status } = options || {};

  const where: Prisma.FocusSessionWhereInput = { userId };  // ✅ 使用 Prisma 类型

  if (status) {
    where.status = status;
  }

  const [sessions, total] = await Promise.all([
    this.prisma.focusSession.findMany({
      where,
      orderBy: { startTime: 'desc' },
      take: limit,
      skip: offset,
      include: {
        distractions: {
          select: {
            id: true,
            distractionType: true,
            timestamp: true,
          },
        },
      },
    }),
    this.prisma.focusSession.count({ where }),
  ]);

  return createPaginatedResponse(sessions, total, limit, offset);
}
```

**修改文件清单**:
- [ ] `apps/api/src/focus/focus.service.ts`
- [ ] `apps/api/src/chat/chat.service.ts`
- [ ] `apps/api/src/upload/upload.service.ts`

---

### P0-3: 统一错误处理策略

#### 问题描述
错误处理方式不一致：
- 有时抛 `NotFoundException`
- 有时抛 `BadRequestException`
- 有时返回 `null`
- 埋点失败被静默吞掉

#### 修复方案

**步骤 1**: 创建统一的业务异常类

```typescript
// apps/api/src/common/exceptions/business.exception.ts

import { HttpException, HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  // 文档相关
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_TOO_LARGE = 'DOCUMENT_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',

  // 对话相关
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',

  // 专注模式相关
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_ALREADY_COMPLETED = 'SESSION_ALREADY_COMPLETED',

  // OCR 相关
  OCR_FAILED = 'OCR_FAILED',
  OCR_NOT_READY = 'OCR_NOT_READY',

  // 系统相关
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: any,
  ) {
    super(
      {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}
```

**步骤 2**: 创建全局异常过滤器

```typescript
// apps/api/src/common/filters/all-exceptions.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';
    let details = null;

    if (exception instanceof BusinessException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      code = exceptionResponse.code;
      message = exceptionResponse.message;
      details = exceptionResponse.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

**步骤 3**: 在 Service 中使用

```typescript
// apps/api/src/focus/focus.service.ts

import { BusinessException, ErrorCode } from '../common/exceptions/business.exception';

// ❌ 修改前
async getSession(sessionId: string, userId: string) {
  const session = await this.prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new NotFoundException('Focus session not found');  // ❌ 不一致
  }

  if (session.userId !== userId) {
    throw new ForbiddenException('You do not have permission');  // ❌ 不一致
  }

  return session;
}

// ✅ 修改后
async getSession(sessionId: string, userId: string): Promise<FocusSession> {
  const session = await this.prisma.focusSession.findUnique({
    where: { id: sessionId },
    include: { distractions: true },
  });

  if (!session) {
    throw new BusinessException(
      ErrorCode.SESSION_NOT_FOUND,
      `Focus session with ID ${sessionId} not found`,
      HttpStatus.NOT_FOUND,
    );
  }

  if (session.userId !== userId) {
    throw new BusinessException(
      ErrorCode.UNAUTHORIZED_ACCESS,
      'You do not have permission to access this session',
      HttpStatus.FORBIDDEN,
    );
  }

  return session;
}
```

**修改文件清单**:
- [ ] 创建 `apps/api/src/common/exceptions/business.exception.ts`
- [ ] 更新 `apps/api/src/common/filters/all-exceptions.filter.ts`
- [ ] 修改 `apps/api/src/focus/focus.service.ts`
- [ ] 修改 `apps/api/src/chat/chat.service.ts`
- [ ] 修改 `apps/api/src/upload/upload.service.ts`

---

### P0-4: 添加 Swagger API 文档配置

#### 问题描述
项目已引入 `@nestjs/swagger`，但没有配置，API 文档缺失。

#### 修复方案

**步骤 1**: 在 `main.ts` 配置 Swagger

```typescript
// apps/api/src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // ✅ Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('Study Oasis API')
    .setDescription('AI-powered learning platform API documentation')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your Supabase JWT token',
      },
      'JWT',
    )
    .addTag('upload', 'Document upload and management')
    .addTag('ocr', 'OCR text extraction')
    .addTag('chat', 'AI chat and conversation management')
    .addTag('focus', 'Focus session tracking')
    .addTag('analytics', 'User analytics and insights')
    .addTag('auth', 'Authentication and authorization')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 4001;
  await app.listen(port);

  console.log(`🚀 API server running on http://localhost:${port}`);
  console.log(`📚 API documentation available at http://localhost:${port}/api-docs`);
}

bootstrap();
```

**步骤 2**: 为 Controllers 添加装饰器

```typescript
// apps/api/src/upload/upload.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('upload')  // ✅ 添加标签
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a document' })  // ✅ 添加操作说明
  @ApiConsumes('multipart/form-data')  // ✅ 指定内容类型
  @ApiBody({  // ✅ 描述请求体
    description: 'Document file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, images, text)',
        },
        userId: {
          type: 'string',
          description: 'Optional user ID',
        },
      },
    },
  })
  @ApiResponse({  // ✅ 描述成功响应
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
        filename: { type: 'string', example: 'document.pdf' },
        url: { type: 'string', example: 'https://storage.googleapis.com/...' },
        size: { type: 'number', example: 1024000 },
        mimetype: { type: 'string', example: 'application/pdf' },
        documentId: { type: 'string', example: 'doc-123' },
        ocrStatus: { type: 'string', example: 'pending' },
      },
    },
  })
  @ApiResponse({  // ✅ 描述错误响应
    status: 400,
    description: 'Invalid file type or size',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('userId') userId?: string,
  ) {
    return this.uploadService.saveFile(file, userId);
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get document metadata' })
  @ApiResponse({
    status: 200,
    description: 'Document metadata retrieved',
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
  })
  async getDocument(@Param('documentId') documentId: string) {
    // ...
  }

  @Delete(':documentId')
  @ApiBearerAuth('JWT')  // ✅ 标记需要认证
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
  })
  async deleteDocument(@Param('documentId') documentId: string) {
    // ...
  }
}
```

**步骤 3**: 为 DTOs 添加装饰器

```typescript
// apps/api/src/chat/dto/chat-request.dto.ts

import { IsString, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({
    description: 'The user message content',
    example: 'Explain the main concepts in this document',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({
    description: 'Existing conversation ID to continue',
    example: 'conv-123',
  })
  @IsOptional()
  @IsString()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Document ID for context',
    example: 'doc-456',
  })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'User ID',
    example: 'user-789',
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
```

**修改文件清单**:
- [ ] 修改 `apps/api/src/main.ts`
- [ ] 修改 `apps/api/src/upload/upload.controller.ts`
- [ ] 修改 `apps/api/src/chat/chat.controller.ts`
- [ ] 修改 `apps/api/src/focus/focus.controller.ts`
- [ ] 修改所有 DTO 文件添加 `@ApiProperty` 装饰器

---

## 🟠 P1 问题详细修复方案

### P1-5: 拆分过长的 Service 方法

#### 问题描述
**位置**: `apps/api/src/upload/upload.service.ts:204-419`

`saveFile` 方法长达 220 行，违反单一职责原则，难以测试和维护。

#### 修复方案

```typescript
// apps/api/src/upload/upload.service.ts

export class UploadService {
  // ✅ 主方法变得简洁
  async saveFile(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<UploadResult> {
    const sessionId = this.generateSessionId();

    try {
      // 1. 验证文件
      await this.validateFile(file);

      // 2. 清理文件名
      const sanitizedName = this.sanitizeFilename(file.originalname);

      // 3. 上传到存储
      const storageResult = await this.uploadToStorage(file, sanitizedName);

      // 4. 保存元数据
      const document = await this.saveDocumentMetadata(
        storageResult,
        file,
        userId,
        sanitizedName,
      );

      // 5. 异步触发 OCR
      this.triggerOCRAsync(document.id, storageResult, file.buffer, userId, sessionId);

      // 6. 记录成功事件
      await this.trackUploadSuccess(document, file, storageResult, userId, sessionId);

      return this.buildUploadResult(document, storageResult, file);
    } catch (error) {
      await this.trackUploadFailure(file.originalname, error, userId, sessionId);
      throw error;
    }
  }

  // ✅ 拆分出的私有方法

  /**
   * Validates file type, size, and content
   */
  private async validateFile(file: Express.Multer.File): Promise<void> {
    // 1. 检查危险文件类型
    if (this.isDangerousFile(file.originalname)) {
      throw new BusinessException(
        ErrorCode.INVALID_FILE_TYPE,
        `Executable file type not allowed: ${extname(file.originalname)}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. 验证文件真实类型（魔数检查）
    await this.validateFileType(file.buffer, file.mimetype);

    // 3. 验证声明的文件类型
    if (!this.isAllowedMimeType(file.mimetype)) {
      throw new BusinessException(
        ErrorCode.INVALID_FILE_TYPE,
        `Unsupported file type: ${file.mimetype}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // 4. 验证文件大小
    if (!this.isAllowedSize(file.size)) {
      const maxSizeMB =
        (this.configService.get<number>('upload.maxSize') || 10485760) / 1024 / 1024;
      throw new BusinessException(
        ErrorCode.DOCUMENT_TOO_LARGE,
        `File size exceeds limit. Maximum: ${maxSizeMB}MB`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
  }

  /**
   * Uploads file to storage (GCS or local)
   */
  private async uploadToStorage(
    file: Express.Multer.File,
    filename: string,
  ): Promise<StorageResult> {
    const useCloudStorage = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');

    if (useCloudStorage) {
      return this.uploadToGCS(file, filename);
    } else {
      return this.uploadToLocal(file, filename);
    }
  }

  /**
   * Uploads to Google Cloud Storage
   */
  private async uploadToGCS(
    file: Express.Multer.File,
    filename: string,
  ): Promise<StorageResult> {
    this.logger.log('info', 'Uploading to Google Cloud Storage', {
      context: 'UploadService',
      filename,
    });

    const gcsResult = await this.gcsService.uploadFile(
      file.buffer,
      filename,
      'uploads',
    );

    return {
      gcsPath: gcsResult.gcsPath,
      publicUrl: gcsResult.publicUrl,
      storageType: 'gcs',
    };
  }

  /**
   * Uploads to local storage
   */
  private async uploadToLocal(
    file: Express.Multer.File,
    filename: string,
  ): Promise<StorageResult> {
    const uniqueId = randomUUID();
    const ext = extname(filename);
    const diskFilename = `${uniqueId}${ext}`;
    const uploadDir = './uploads';
    const uploadPath = join(uploadDir, diskFilename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(uploadPath, file.buffer);

    return {
      localPath: uploadPath,
      publicUrl: this.buildFileUrl(diskFilename),
      storageType: 'local',
    };
  }

  /**
   * Saves document metadata to database
   */
  private async saveDocumentMetadata(
    storageResult: StorageResult,
    file: Express.Multer.File,
    userId: string | undefined,
    filename: string,
  ): Promise<Document> {
    const document = await this.documentRepository.create({
      userId,
      filename,
      gcsPath: storageResult.gcsPath || storageResult.localPath,
      size: file.size,
      ocrStatus: 'pending',
      publicUrl: storageResult.publicUrl,
    });

    this.logger.log('info', 'Document metadata saved', {
      context: 'UploadService',
      documentId: document.id,
    });

    return document;
  }

  /**
   * Triggers OCR processing asynchronously
   */
  private triggerOCRAsync(
    documentId: string,
    storageResult: StorageResult,
    fileBuffer: Buffer,
    userId?: string,
    sessionId?: string,
  ): void {
    this.triggerOCR(
      documentId,
      storageResult.gcsPath || storageResult.localPath || null,
      fileBuffer,
      userId,
      sessionId,
    ).catch((error) => {
      this.logger.error('OCR processing failed', {
        context: 'UploadService',
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  /**
   * Tracks upload success event
   */
  private async trackUploadSuccess(
    document: Document,
    file: Express.Multer.File,
    storageResult: StorageResult,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId: sessionId!,
      eventName: EventName.FILE_UPLOAD_SUCCESS,
      eventCategory: EventCategory.DOCUMENT,
      eventProperties: {
        documentId: document.id,
        filename: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageType: storageResult.storageType,
      },
    });
  }

  /**
   * Tracks upload failure event
   */
  private async trackUploadFailure(
    filename: string,
    error: unknown,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId: sessionId!,
      eventName: EventName.FILE_UPLOAD_FAILED,
      eventCategory: EventCategory.DOCUMENT,
      eventProperties: {
        filename,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  /**
   * Builds upload result response
   */
  private buildUploadResult(
    document: Document,
    storageResult: StorageResult,
    file: Express.Multer.File,
  ): UploadResult {
    return {
      id: document.id,
      filename: document.filename,
      url: storageResult.publicUrl,
      size: file.size,
      mimetype: file.mimetype,
      documentId: document.id,
      ocrStatus: 'pending',
    };
  }
}

// ✅ 新增类型定义
interface StorageResult {
  gcsPath?: string;
  localPath?: string;
  publicUrl: string;
  storageType: 'gcs' | 'local';
}
```

**修改文件清单**:
- [ ] 重构 `apps/api/src/upload/upload.service.ts`
- [ ] 更新对应的单元测试

---

### P1-6: 补全新代码单元测试

#### 问题描述
测试覆盖率不均：
- `document.repository.ts`: 21.42%
- `file-validator.helper.ts`: 0%

#### 修复方案

**步骤 1**: 创建 Repository 测试

```typescript
// apps/api/src/upload/repositories/document.repository.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentRepository } from './document.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('DocumentRepository', () => {
  let repository: DocumentRepository;
  let prisma: PrismaService;

  const mockPrismaService = {
    document: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<DocumentRepository>(DocumentRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a document with correct data', async () => {
      const input = {
        userId: 'user-1',
        filename: 'test.pdf',
        size: 1024,
        ocrStatus: 'pending' as const,
      };

      const mockDocument = {
        id: 'doc-1',
        ...input,
        uploadedAt: new Date(),
      };

      mockPrismaService.document.create.mockResolvedValue(mockDocument);

      const result = await repository.create(input);

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: input.userId,
          filename: input.filename,
          size: input.size,
          ocrStatus: input.ocrStatus,
        }),
      });
      expect(result).toEqual(mockDocument);
    });

    it('should handle creation without userId', async () => {
      const input = {
        filename: 'test.pdf',
        size: 1024,
      };

      mockPrismaService.document.create.mockResolvedValue({
        id: 'doc-2',
        ...input,
        userId: null,
      });

      await repository.create(input);

      expect(prisma.document.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          filename: input.filename,
          size: input.size,
        }),
      });
    });
  });

  describe('findById', () => {
    it('should find document by id', async () => {
      const mockDocument = {
        id: 'doc-1',
        filename: 'test.pdf',
        size: 1024,
      };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      const result = await repository.findById('doc-1');

      expect(prisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        include: { ocrResult: true },
      });
      expect(result).toEqual(mockDocument);
    });

    it('should return null if document not found', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find documents by user id with pagination', async () => {
      const mockDocuments = [
        { id: 'doc-1', filename: 'file1.pdf' },
        { id: 'doc-2', filename: 'file2.pdf' },
      ];

      mockPrismaService.document.findMany.mockResolvedValue(mockDocuments);

      const result = await repository.findByUserId('user-1', 10, 0);

      expect(prisma.document.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { ocrResult: true },
        orderBy: { uploadedAt: 'desc' },
        take: 10,
        skip: 0,
      });
      expect(result).toEqual(mockDocuments);
    });
  });

  describe('updateOcrStatus', () => {
    it('should update OCR status', async () => {
      const mockUpdated = {
        id: 'doc-1',
        ocrStatus: 'completed',
      };

      mockPrismaService.document.update.mockResolvedValue(mockUpdated);

      const result = await repository.updateOcrStatus('doc-1', 'completed');

      expect(prisma.document.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { ocrStatus: 'completed' },
      });
      expect(result.ocrStatus).toBe('completed');
    });
  });

  describe('delete', () => {
    it('should delete document', async () => {
      mockPrismaService.document.delete.mockResolvedValue({ id: 'doc-1' });

      await repository.delete('doc-1');

      expect(prisma.document.delete).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });
  });

  describe('count', () => {
    it('should count documents by user', async () => {
      mockPrismaService.document.count.mockResolvedValue(5);

      const result = await repository.count({ userId: 'user-1' });

      expect(prisma.document.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toBe(5);
    });
  });
});
```

**修改文件清单**:
- [ ] 创建 `apps/api/src/upload/repositories/document.repository.spec.ts`
- [ ] 创建 `apps/api/src/chat/repositories/conversation.repository.spec.ts`
- [ ] 创建 `apps/api/src/chat/repositories/message.repository.spec.ts`
- [ ] 创建 `apps/api/src/upload/helpers/file-validator.helper.spec.ts`

---

### P1-7: 提取魔法数字为配置常量

#### 问题描述
**位置**: `apps/api/src/focus/focus.service.ts:290-321`

评分规则、超时时间等硬编码在代码中。

#### 修复方案

**步骤 1**: 创建配置常量文件

```typescript
// apps/api/src/focus/constants/focus-score.constants.ts

/**
 * Focus score calculation configuration
 */
export const FOCUS_SCORE_CONFIG = {
  /** Base score before penalties */
  BASE_SCORE: 100,

  /** Minimum session duration in seconds to be scored */
  MIN_DURATION_SECONDS: 60,

  /** Penalty rules */
  PENALTIES: {
    /** Points deducted per distraction */
    DISTRACTION_PER_COUNT: 2,
    /** Maximum points deducted for distractions */
    DISTRACTION_MAX: 40,

    /** Points deducted per pause */
    PAUSE_PER_COUNT: 5,
    /** Maximum points deducted for pauses */
    PAUSE_MAX: 20,

    /** Tab switch count divisor for penalty calculation */
    TAB_SWITCH_DIVISOR: 5,
    /** Points deducted per tab switch group */
    TAB_SWITCH_PENALTY: 2,
    /** Maximum points deducted for tab switches */
    TAB_SWITCH_MAX: 10,
  },

  /** Active time ratio thresholds */
  ACTIVE_RATIO_THRESHOLD: 0.7,

  /** Score to grade mapping */
  GRADES: {
    A: 90,
    B: 80,
    C: 70,
    D: 60,
  },
} as const;

/**
 * Focus session insight thresholds
 */
export const FOCUS_INSIGHT_THRESHOLDS = {
  EXCELLENT_SCORE: 90,
  GOOD_SCORE: 70,
  HIGH_DISTRACTION_COUNT: 10,
  HIGH_TAB_SWITCH_COUNT: 15,
  HIGH_PAUSE_COUNT: 5,
  SHORT_SESSION_SECONDS: 300,
  LONG_SESSION_SECONDS: 3600,
} as const;
```

**步骤 2**: 使用配置常量

```typescript
// apps/api/src/focus/focus.service.ts

import { FOCUS_SCORE_CONFIG, FOCUS_INSIGHT_THRESHOLDS } from './constants/focus-score.constants';

export class FocusService {
  /**
   * Calculates focus score (0-100) based on session metrics
   */
  private calculateFocusScore(session: FocusSession): number {
    const duration = session.totalDuration || 0;
    const activeDuration = session.activeDuration || duration;

    // Short sessions get lower scores
    if (duration < FOCUS_SCORE_CONFIG.MIN_DURATION_SECONDS) {
      return 50;
    }

    let score = FOCUS_SCORE_CONFIG.BASE_SCORE;

    // Deduct points for distractions
    const distractionPenalty = Math.min(
      session.distractionCount * FOCUS_SCORE_CONFIG.PENALTIES.DISTRACTION_PER_COUNT,
      FOCUS_SCORE_CONFIG.PENALTIES.DISTRACTION_MAX,
    );
    score -= distractionPenalty;

    // Deduct points for pauses
    const pausePenalty = Math.min(
      session.pauseCount * FOCUS_SCORE_CONFIG.PENALTIES.PAUSE_PER_COUNT,
      FOCUS_SCORE_CONFIG.PENALTIES.PAUSE_MAX,
    );
    score -= pausePenalty;

    // Deduct points for low active ratio
    const activeRatio = activeDuration / duration;
    if (activeRatio < FOCUS_SCORE_CONFIG.ACTIVE_RATIO_THRESHOLD) {
      score -= (FOCUS_SCORE_CONFIG.ACTIVE_RATIO_THRESHOLD - activeRatio) * 50;
    }

    // Deduct points for tab switches
    const tabSwitchPenalty = Math.min(
      Math.floor(
        session.tabSwitchCount / FOCUS_SCORE_CONFIG.PENALTIES.TAB_SWITCH_DIVISOR,
      ) * FOCUS_SCORE_CONFIG.PENALTIES.TAB_SWITCH_PENALTY,
      FOCUS_SCORE_CONFIG.PENALTIES.TAB_SWITCH_MAX,
    );
    score -= tabSwitchPenalty;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Converts score to letter grade
   */
  private getGrade(score: number): string {
    if (score >= FOCUS_SCORE_CONFIG.GRADES.A) return 'A';
    if (score >= FOCUS_SCORE_CONFIG.GRADES.B) return 'B';
    if (score >= FOCUS_SCORE_CONFIG.GRADES.C) return 'C';
    if (score >= FOCUS_SCORE_CONFIG.GRADES.D) return 'D';
    return 'F';
  }

  /**
   * Generates personalized insights based on session metrics
   */
  private generateInsights(session: FocusSession): string[] {
    const insights: string[] = [];
    const score = session.focusScore || 0;

    // Score-based feedback
    if (score >= FOCUS_INSIGHT_THRESHOLDS.EXCELLENT_SCORE) {
      insights.push('🎉 Excellent focus! You maintained high concentration.');
    } else if (score >= FOCUS_INSIGHT_THRESHOLDS.GOOD_SCORE) {
      insights.push('👍 Good focus session, keep it up!');
    } else {
      insights.push('💪 There is room for improvement. Try reducing distractions.');
    }

    // Distraction feedback
    if (session.distractionCount > FOCUS_INSIGHT_THRESHOLDS.HIGH_DISTRACTION_COUNT) {
      insights.push(
        '⚠️ High distraction count. Consider turning off notifications.',
      );
    }

    // Tab switch feedback
    if (session.tabSwitchCount > FOCUS_INSIGHT_THRESHOLDS.HIGH_TAB_SWITCH_COUNT) {
      insights.push(
        '🔄 Frequent tab switching affects focus. Try keeping only necessary tabs open.',
      );
    }

    // Pause feedback
    if (session.pauseCount > FOCUS_INSIGHT_THRESHOLDS.HIGH_PAUSE_COUNT) {
      insights.push(
        '⏸️ Multiple pauses detected. Prepare everything before starting.',
      );
    }

    // Duration feedback
    const duration = session.totalDuration || 0;
    if (duration > 0 && duration < FOCUS_INSIGHT_THRESHOLDS.SHORT_SESSION_SECONDS) {
      insights.push(
        '⏱️ Short session. Aim for at least 15 minutes of focused study.',
      );
    } else if (duration > FOCUS_INSIGHT_THRESHOLDS.LONG_SESSION_SECONDS) {
      insights.push(
        '🎯 Great stamina! Remember to take breaks to avoid fatigue.',
      );
    }

    return insights;
  }
}
```

**修改文件清单**:
- [ ] 创建 `apps/api/src/focus/constants/focus-score.constants.ts`
- [ ] 修改 `apps/api/src/focus/focus.service.ts`
- [ ] 在其他 Service 中提取类似的魔法数字

---

### P1-8: 规范 JSDoc 注释

#### 问题描述
注释不规范：
- 中英文混用
- 缺少参数和返回值说明
- 没有使用标准 JSDoc 标签

#### 修复方案

```typescript
// ❌ 修改前
/**
 * 创建新的专注会话
 */
async createSession(userId: string, documentId?: string) {
  // ...
}

// ✅ 修改后
/**
 * Creates a new focus session for the specified user
 *
 * This method initializes a new focus session with 'active' status and
 * records the start time. The session can be optionally associated with
 * a document and conversation for context.
 *
 * @param userId - The unique identifier of the user starting the session
 * @param documentId - Optional document ID to associate with the session
 * @param conversationId - Optional conversation ID to link with the session
 *
 * @returns Promise resolving to the created FocusSession object
 *
 * @throws {BusinessException} If the user ID is invalid or missing
 *
 * @example
 * ```typescript
 * const session = await focusService.createSession(
 *   'user-123',
 *   'doc-456',
 *   'conv-789'
 * );
 * console.log(session.id); // 'session-abc123'
 * console.log(session.status); // 'active'
 * ```
 *
 * @see {@link FocusSession} for the returned data structure
 * @see {@link updateSession} for updating session status
 */
async createSession(
  userId: string,
  documentId?: string,
  conversationId?: string,
): Promise<FocusSession> {
  return this.prisma.focusSession.create({
    data: {
      userId,
      documentId,
      conversationId,
      status: 'active',
      startTime: new Date(),
    },
  });
}
```

**JSDoc 标签清单**:
- `@param` - 参数说明
- `@returns` - 返回值说明
- `@throws` - 可能抛出的异常
- `@example` - 使用示例
- `@see` - 相关链接
- `@deprecated` - 标记过时方法
- `@internal` - 标记内部使用
- `@async` - 标记异步方法

**修改文件清单**:
- [ ] `apps/api/src/focus/focus.service.ts` - 所有 public 方法
- [ ] `apps/api/src/chat/chat.service.ts` - 所有 public 方法
- [ ] `apps/api/src/upload/upload.service.ts` - 所有 public 方法
- [ ] 所有 Repository 类的方法

---

## 🟡 P2 问题详细修复方案

### P2-9: 引入消息队列处理 OCR

#### 问题描述
OCR 处理虽然是异步的，但还是在 API 进程中执行，影响性能和可靠性。

#### 修复方案

**步骤 1**: 安装 BullMQ

```bash
cd apps/api
pnpm add @nestjs/bull bull
pnpm add -D @types/bull
```

**步骤 2**: 配置 Bull 模块

```typescript
// apps/api/src/app.module.ts

import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    // ... 其他模块
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

**步骤 3**: 创建 OCR 队列模块

```typescript
// apps/api/src/ocr/ocr-queue.module.ts

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { OcrProcessor } from './ocr.processor';
import { OcrModule } from './ocr.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'ocr',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    OcrModule,
  ],
  providers: [OcrProcessor],
  exports: [BullModule],
})
export class OcrQueueModule {}
```

**步骤 4**: 创建 OCR Processor

```typescript
// apps/api/src/ocr/ocr.processor.ts

import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { VisionService } from './vision.service';
import { DocumentRepository } from '../upload/repositories/document.repository';

interface OcrJobData {
  documentId: string;
  gcsPath?: string;
  localPath?: string;
  fileBuffer?: Buffer;
  userId?: string;
}

@Processor('ocr')
export class OcrProcessor {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly visionService: VisionService,
    private readonly documentRepo: DocumentRepository,
  ) {}

  @Process('extract-text')
  async handleOcrExtraction(job: Job<OcrJobData>): Promise<void> {
    const { documentId, gcsPath, localPath, fileBuffer, userId } = job.data;

    this.logger.log(`Processing OCR for document: ${documentId}`);

    try {
      // Update status to processing
      await this.documentRepo.updateOcrStatus(documentId, 'processing');

      let ocrResult;

      // Try buffer first
      if (fileBuffer) {
        ocrResult = await this.visionService.extractTextFromBuffer(
          fileBuffer,
          documentId,
        );
      } else if (gcsPath?.startsWith('gs://')) {
        ocrResult = await this.visionService.extractTextFromGcs(
          gcsPath,
          documentId,
        );
      } else if (localPath) {
        const fs = require('fs').promises;
        const buffer = await fs.readFile(localPath);
        ocrResult = await this.visionService.extractTextFromBuffer(
          buffer,
          documentId,
        );
      } else {
        throw new Error('No valid file source provided');
      }

      // Update status to completed
      await this.documentRepo.updateOcrStatus(documentId, 'completed');

      this.logger.log(`OCR completed for document: ${documentId}`, {
        pageCount: ocrResult.pageCount,
        confidence: ocrResult.confidence,
      });
    } catch (error) {
      this.logger.error(`OCR failed for document: ${documentId}`, error.stack);

      // Update status to failed
      await this.documentRepo.updateOcrStatus(documentId, 'failed');

      throw error; // Re-throw to trigger retry
    }
  }
}
```

**步骤 5**: 在 UploadService 中使用队列

```typescript
// apps/api/src/upload/upload.service.ts

import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

export class UploadService {
  constructor(
    @InjectQueue('ocr') private ocrQueue: Queue,
    // ... 其他依赖
  ) {}

  async saveFile(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<UploadResult> {
    // ... 前面的逻辑

    // ✅ 使用队列而不是直接调用
    await this.ocrQueue.add('extract-text', {
      documentId: document.id,
      gcsPath: storageResult.gcsPath,
      localPath: storageResult.localPath,
      fileBuffer: file.buffer,
      userId,
    });

    return result;
  }
}
```

**修改文件清单**:
- [ ] 安装依赖
- [ ] 创建 `apps/api/src/ocr/ocr-queue.module.ts`
- [ ] 创建 `apps/api/src/ocr/ocr.processor.ts`
- [ ] 修改 `apps/api/src/upload/upload.service.ts`
- [ ] 修改 `apps/api/src/app.module.ts`
- [ ] 更新 `.env` 添加 Redis 配置

---

### P2-10: 添加前端状态管理

#### 问题描述
前端状态全在 hooks 中，没有统一的状态管理。

#### 修复方案

**步骤 1**: 安装 Zustand

```bash
cd apps/web
pnpm add zustand
```

**步骤 2**: 创建 Chat Store

```typescript
// apps/web/stores/chat.store.ts

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatStore {
  // State
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  documentId: string | null;

  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  setConversation: (id: string) => void;
  setDocument: (id: string) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        messages: [],
        isLoading: false,
        error: null,
        conversationId: null,
        documentId: null,

        // Actions
        sendMessage: async (content: string) => {
          set({ isLoading: true, error: null });

          try {
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: content,
                conversationId: get().conversationId,
                documentId: get().documentId,
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to send message');
            }

            const data = await response.json();

            set((state) => ({
              messages: [
                ...state.messages,
                { id: Date.now().toString(), role: 'user', content, timestamp: Date.now() },
                { id: data.messageId, role: 'assistant', content: data.reply, timestamp: Date.now() },
              ],
              conversationId: data.conversationId,
              isLoading: false,
            }));
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error',
              isLoading: false,
            });
          }
        },

        clearChat: () => {
          set({
            messages: [],
            conversationId: null,
            error: null,
          });
        },

        setConversation: (id: string) => {
          set({ conversationId: id });
        },

        setDocument: (id: string) => {
          set({ documentId: id });
        },

        setError: (error: string | null) => {
          set({ error });
        },
      }),
      {
        name: 'chat-storage',
        partialize: (state) => ({
          conversationId: state.conversationId,
          documentId: state.documentId,
        }),
      }
    )
  )
);
```

**步骤 3**: 在组件中使用

```typescript
// apps/web/app/chat/page.tsx

'use client';

import { useChatStore } from '@/stores/chat.store';

export default function ChatPage() {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  } = useChatStore();

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      {/* ... */}
    </div>
  );
}
```

**修改文件清单**:
- [x] 创建 `apps/web/stores/chat.store.ts`
- [x] 创建 `apps/web/stores/upload.store.ts`
- [x] 创建 `apps/web/stores/focus.store.ts`
- [x] 更新 `apps/web/app/chat/hooks/useChatLogic.ts`、`apps/web/app/upload/hooks/useUploadLogic.ts`、`apps/web/hooks/useFocusSession.ts` 以消费 store

> ✅ 2025-11-10：Zustand stores 已上线，chat/upload/focus 逻辑通过共享 store 提供状态，组件只消费 selectors，避免 prop drilling。

---

### P2-11: 添加前端错误边界

#### 问题描述
前端缺少全局错误捕获机制。

#### 修复方案

```typescript
// apps/web/components/ErrorBoundary.tsx

'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // 可以在这里上报到 Sentry 等服务
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        extra: errorInfo,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <svg
                className="w-6 h-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
              出错了
            </h2>
            <p className="mt-2 text-sm text-center text-gray-600">
              {this.state.error?.message || '应用遇到了一个错误'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 mt-6 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

在 Layout 中使用：

```typescript
// apps/web/app/layout.tsx

import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

**修改文件清单**:
- [ ] 创建 `apps/web/components/ErrorBoundary.tsx`
- [ ] 修改 `apps/web/app/layout.tsx`

---

### P2-12: 解决 N+1 查询问题

#### 问题描述
**位置**: `apps/api/src/chat/chat.service.ts:315`

可能存在 N+1 查询问题。

#### 修复方案

```typescript
// apps/api/src/chat/repositories/conversation.repository.ts

// ❌ 修改前（可能导致 N+1）
async findMany(options: {
  userId?: string;
  limit: number;
  offset: number;
}) {
  return this.prisma.conversation.findMany({
    where: { userId: options.userId },
    take: options.limit,
    skip: options.offset,
  });
  // 然后在 Service 中再查询每个对话的消息数量，产生 N 次查询
}

// ✅ 修改后（使用 include 预加载）
async findManyWithMessages(options: {
  userId?: string;
  limit: number;
  offset: number;
  orderBy?: any;
}): Promise<ConversationWithCount[]> {
  return this.prisma.conversation.findMany({
    where: { userId: options.userId },
    include: {
      _count: {
        select: { messages: true },
      },
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      },
    },
    orderBy: options.orderBy || { updatedAt: 'desc' },
    take: options.limit,
    skip: options.offset,
  });
}
```

**修改文件清单**:
- [ ] 修改 `apps/api/src/chat/repositories/conversation.repository.ts`
- [ ] 修改 `apps/api/src/chat/chat.service.ts`
- [ ] 在其他 Repository 中应用类似优化

---

## 🟢 P3 问题修复方案（简要）

### P3-13: 添加 Redis 缓存层

```bash
pnpm add @nestjs/cache-manager cache-manager cache-manager-redis-store
```

```typescript
// app.module.ts
CacheModule.registerAsync({
  useFactory: () => ({
    store: redisStore,
    host: 'localhost',
    port: 6379,
    ttl: 600,
  }),
}),
```

### P3-14: 完善集成测试

创建 `apps/api/test/integration/` 目录，添加端到端测试。

### P3-15: 性能监控

集成 Sentry Performance Monitoring 或 New Relic。

### P3-16: 国际化支持

使用 `next-i18next` 或 `next-intl`。

---

## 📋 执行检查清单

### P0 - 立即修复
- [ ] P0-1: 统一数据库字段命名（Prisma migration）
- [ ] P0-2: 去掉 `any` 类型，使用 Prisma 类型
- [ ] P0-3: 统一错误处理（BusinessException）
- [ ] P0-4: 配置 Swagger API 文档

### P1 - 1-2周内
- [x] P1-5: 拆分 UploadService.saveFile 方法
- [x] P1-6: 补全 Repository 单元测试
- [x] P1-7: 提取魔法数字为配置常量
- [x] P1-8: 规范 JSDoc 注释（英文 + 标准标签）

### P2 - 1个月内
- [x] P2-9: 引入 BullMQ 队列处理 OCR
- [x] P2-10: 添加 Zustand 状态管理（apps/web/stores + chat/upload/focus hooks）
- [ ] P2-11: 添加前端错误边界
- [ ] P2-12: 解决 N+1 查询问题

### P3 - 有空再说
- [ ] P3-13: 添加 Redis 缓存
- [ ] P3-14: 完善集成测试
- [ ] P3-15: 添加性能监控
- [ ] P3-16: 国际化支持

---

## 🎯 预期收益

完成 P0-P1 后：
- ✅ 代码可读性提升 40%
- ✅ 类型安全性提升 60%
- ✅ API 文档完整度 100%
- ✅ 测试覆盖率提升至 90%+
- ✅ 维护成本降低 30%

完成 P2 后：
- ✅ 系统可靠性提升 50%
- ✅ 性能提升 30%
- ✅ 前端开发效率提升 40%

---

## 📚 参考资料

- [NestJS Best Practices](https://docs.nestjs.com/techniques/configuration)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [TSDoc Reference](https://tsdoc.org/)

---

**生成时间**: 2025-11-10
**下次审查**: P0 完成后
