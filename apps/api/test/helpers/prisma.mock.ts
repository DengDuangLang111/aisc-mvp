import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * 测试工具 - Prisma Mock
 * 
 * 提供 Prisma Service 的 Mock 实现，用于单元测试
 */
export const createMockPrismaService = (): Partial<PrismaService> => {
  return {
    document: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any,
    ocrResult: {
      create: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    } as any,
    conversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any,
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    } as any,
    analyticsEvent: {
      create: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    } as any,
    apiUsageLog: {
      create: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    } as any,
    userDailyStat: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    } as any,
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
};

/**
 * 创建 Mock 文档数据
 */
export const createMockDocument = (overrides?: Partial<any>) => ({
  id: 'doc-123',
  userId: 'user-123',
  filename: 'test.pdf',
  gcsPath: 'gs://bucket/uploads/test.pdf',
  mimeType: 'application/pdf',
  size: 1024000,
  uploadedAt: new Date(),
  ...overrides,
});

/**
 * 创建 Mock OCR 结果数据
 */
export const createMockOcrResult = (overrides?: Partial<any>) => ({
  id: 'ocr-123',
  documentId: 'doc-123',
  fullText: 'This is the extracted text content.',
  structuredData: { pages: [] },
  language: 'en',
  confidence: 0.98,
  pageCount: 1,
  extractedAt: new Date(),
  ...overrides,
});

/**
 * 创建 Mock 对话数据
 */
export const createMockConversation = (overrides?: Partial<any>) => ({
  id: 'conv-123',
  userId: 'user-123',
  documentId: 'doc-123',
  title: 'Test Conversation',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * 创建 Mock 消息数据
 */
export const createMockMessage = (overrides?: Partial<any>) => ({
  id: 'msg-123',
  conversationId: 'conv-123',
  role: 'user',
  content: 'Hello, AI!',
  hintLevel: null,
  modelUsed: null,
  tokensUsed: null,
  timestamp: new Date(),
  ...overrides,
});
