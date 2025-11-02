import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { VisionService } from '../ocr/vision.service';
import { AnalyticsService } from '../analytics/analytics.service';

describe('ChatService', () => {
  let service: ChatService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        DEEPSEEK_API_KEY: 'test-api-key',
        DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
        DEEPSEEK_MODEL: 'deepseek-chat',
      };
      return config[key];
    }),
  };

  const mockPrismaService = {
    conversation: {
      create: jest.fn().mockResolvedValue({
        id: 'test-conversation-id',
        userId: 'test-user',
        documentId: null,
        title: 'Test Conversation',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'test-conversation-id',
        messages: [],
      }),
      update: jest.fn(),
    },
    message: {
      create: jest.fn().mockResolvedValue({
        id: 'test-message-id',
        role: 'assistant',
        content: 'Test response',
        createdAt: new Date(),
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    document: {
      findUnique: jest.fn(),
    },
    ocrResult: {
      findFirst: jest.fn(),
    },
  };

  const mockVisionService = {
    analyzeImage: jest.fn(),
    processOcr: jest.fn(),
    getOcrResult: jest.fn(),
  };

  const mockAnalyticsService = {
    trackEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: VisionService,
          useValue: mockVisionService,
        },
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should return hint level 1 for first message (no history)', async () => {
      // Mock: 新对话，没有历史消息
      mockPrismaService.conversation.create.mockResolvedValueOnce({
        id: 'test-conv-1',
        userId: 'test-user',
        documentId: null,
        title: 'Test',
        messages: [], // 0 个消息
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: ChatRequestDto = {
        message: '什么是递归？',
        userId: 'test-user',
      };

      const response = await service.chat(request);

      expect(response).toBeDefined();
      expect(response.hintLevel).toBe(1);
      expect(response.timestamp).toBeGreaterThan(0);
    });

    it('should return hint level 1 with one previous message', async () => {
      // Mock: 对话有 1 个用户消息
      mockPrismaService.conversation.findUnique.mockResolvedValueOnce({
        id: 'test-conv-2',
        messages: [
          { id: '1', role: 'user', content: '什么是递归？', conversationId: 'test-conv-2', createdAt: new Date() },
        ],
      });

      const request: ChatRequestDto = {
        message: '能再解释一下吗？',
        conversationId: 'test-conv-2',
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(1);
    });

    it('should return hint level 2 with 2-3 previous messages', async () => {
      // Mock: 对话有 2 个用户消息
      mockPrismaService.conversation.findUnique.mockResolvedValueOnce({
        id: 'test-conv-3',
        messages: [
          { id: '1', role: 'user', content: '什么是递归？', conversationId: 'test-conv-3', createdAt: new Date() },
          { id: '2', role: 'assistant', content: '提示1...', conversationId: 'test-conv-3', createdAt: new Date() },
          { id: '3', role: 'user', content: '能再解释一下吗？', conversationId: 'test-conv-3', createdAt: new Date() },
        ],
      });

      const request: ChatRequestDto = {
        message: '还是不太明白',
        conversationId: 'test-conv-3',
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(2);
    });

    it('should return hint level 3 with 4+ previous messages', async () => {
      // Mock: 对话有 4 个用户消息
      mockPrismaService.conversation.findUnique.mockResolvedValueOnce({
        id: 'test-conv-4',
        messages: [
          { id: '1', role: 'user', content: '问题1', conversationId: 'test-conv-4', createdAt: new Date() },
          { id: '2', role: 'assistant', content: '回答1', conversationId: 'test-conv-4', createdAt: new Date() },
          { id: '3', role: 'user', content: '问题2', conversationId: 'test-conv-4', createdAt: new Date() },
          { id: '4', role: 'assistant', content: '回答2', conversationId: 'test-conv-4', createdAt: new Date() },
          { id: '5', role: 'user', content: '问题3', conversationId: 'test-conv-4', createdAt: new Date() },
          { id: '6', role: 'assistant', content: '回答3', conversationId: 'test-conv-4', createdAt: new Date() },
          { id: '7', role: 'user', content: '问题4', conversationId: 'test-conv-4', createdAt: new Date() },
        ],
      });

      const request: ChatRequestDto = {
        message: '能更详细吗？',
        conversationId: 'test-conv-4',
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(3);
    });

    it('should handle empty conversation history', async () => {
      // Mock: 新对话，无消息历史
      mockPrismaService.conversation.create.mockResolvedValueOnce({
        id: 'test-conv-5',
        userId: 'test-user',
        documentId: null,
        title: 'Test',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: ChatRequestDto = {
        message: '测试消息',
        userId: 'test-user',
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(1);
      expect(response.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should count only user messages in history', async () => {
      // Mock: 4 条消息（2 个用户 + 2 个助手） → 应该是 hintLevel 2
      mockPrismaService.conversation.findUnique.mockResolvedValueOnce({
        id: 'test-conv-6',
        messages: [
          { id: '1', role: 'user', content: '用户消息1', conversationId: 'test-conv-6', createdAt: new Date() },
          { id: '2', role: 'assistant', content: 'AI回答1', conversationId: 'test-conv-6', createdAt: new Date() },
          { id: '3', role: 'user', content: '用户消息2', conversationId: 'test-conv-6', createdAt: new Date() },
          { id: '4', role: 'assistant', content: 'AI回答2', conversationId: 'test-conv-6', createdAt: new Date() },
        ],
      });

      const request: ChatRequestDto = {
        message: '当前问题',
        conversationId: 'test-conv-6',
      };

      const response = await service.chat(request);

      // 2 个用户消息 → hint level 2
      expect(response.hintLevel).toBe(2);
    });

    it('should generate timestamp close to current time', async () => {
      // Mock: 新对话
      mockPrismaService.conversation.create.mockResolvedValueOnce({
        id: 'test-conv-7',
        userId: 'test-user',
        documentId: null,
        title: 'Test',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const beforeTime = Date.now();
      
      const request: ChatRequestDto = {
        message: '测试时间戳',
        userId: 'test-user',
      };

      const response = await service.chat(request);
      const afterTime = Date.now();

      expect(response.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(response.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle very long conversation history', async () => {
      // Mock: 20 条消息（10 个用户 + 10 个助手）
      const longMessages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `消息 ${i}`,
        conversationId: 'test-conv-8',
        createdAt: new Date(),
      }));

      mockPrismaService.conversation.findUnique.mockResolvedValueOnce({
        id: 'test-conv-8',
        messages: longMessages,
      });

      const request: ChatRequestDto = {
        message: '继续提问',
        conversationId: 'test-conv-8',
      };

      const response = await service.chat(request);

      // 10 个用户消息 → hint level 3
      expect(response.hintLevel).toBe(3);
      expect(response.reply).toBeDefined();
    });
  });

  describe('hint level calculation', () => {
    it('should calculate correct hint levels for different message counts', async () => {
      const testCases = [
        { userMessages: 0, expectedLevel: 1 },
        { userMessages: 1, expectedLevel: 1 },
        { userMessages: 2, expectedLevel: 2 },
        { userMessages: 3, expectedLevel: 2 },
        { userMessages: 4, expectedLevel: 3 },
        { userMessages: 5, expectedLevel: 3 },
        { userMessages: 10, expectedLevel: 3 },
      ];

      for (const testCase of testCases) {
        // Mock: 根据测试用例创建不同数量的消息
        const messages = Array.from(
          { length: testCase.userMessages },
          (_, i) => ({
            id: `msg-${i}`,
            role: 'user',
            content: `消息 ${i}`,
            conversationId: 'test-conv',
            createdAt: new Date(),
          })
        );

        if (testCase.userMessages === 0) {
          // 新对话
          mockPrismaService.conversation.create.mockResolvedValueOnce({
            id: 'test-conv',
            userId: 'test-user',
            documentId: null,
            title: 'Test',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          // 现有对话
          mockPrismaService.conversation.findUnique.mockResolvedValueOnce({
            id: 'test-conv',
            messages,
          });
        }

        const request: ChatRequestDto = {
          message: '当前消息',
          conversationId: testCase.userMessages > 0 ? 'test-conv' : undefined,
          userId: testCase.userMessages === 0 ? 'test-user' : undefined,
        };

        const response = await service.chat(request);
        expect(response.hintLevel).toBe(testCase.expectedLevel);
      }
    });
  });

  describe('response content', () => {
    it('should return fallback response when API fails', async () => {
      // Mock: 新对话
      mockPrismaService.conversation.create.mockResolvedValueOnce({
        id: 'conv-1',
        userId: 'test-user',
        documentId: null,
        title: 'Test 1',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await service.chat({ message: '测试', userId: 'test-user' });

      // 当 API 不可用时，应该返回降级响应
      expect(response).toBeDefined();
      expect(response.reply).toContain('抱歉');
      expect(response.hintLevel).toBe(1);
    });
  });

  describe('getConversations', () => {
    it('should return all conversations when no userId provided', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test 1',
          userId: 'user-1',
          _count: { messages: 5 },
          createdAt: new Date(),
        },
        {
          id: 'conv-2',
          title: 'Test 2',
          userId: 'user-2',
          _count: { messages: 3 },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.conversation.findMany = jest.fn().mockResolvedValue(mockConversations);

      const result = await service.getConversations();

      expect(result).toHaveLength(2);
      expect(result[0].messageCount).toBe(5);
      expect(mockPrismaService.conversation.findMany).toHaveBeenCalledWith({
        where: {},
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      });
    });

    it('should filter conversations by userId', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test 1',
          userId: 'user-123',
          _count: { messages: 5 },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.conversation.findMany = jest.fn().mockResolvedValue(mockConversations);

      const result = await service.getConversations('user-123', 10);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.conversation.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: { _count: { select: { messages: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      });
    });
  });

  describe('getConversation', () => {
    it('should return conversation with messages and document', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test Conversation',
        userId: 'user-123',
        documentId: 'doc-123',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello', tokensUsed: 10, createdAt: new Date() },
          { id: 'msg-2', role: 'assistant', content: 'Hi!', tokensUsed: 8, createdAt: new Date() },
        ],
        document: {
          id: 'doc-123',
          filename: 'test.pdf',
          gcsPath: 'gs://bucket/test.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          uploadedAt: new Date(),
          ocrResult: {
            id: 'ocr-1',
            confidence: 0.95,
            language: 'en',
            pageCount: 1,
          },
        },
        createdAt: new Date(),
      };

      mockPrismaService.conversation.findUnique.mockResolvedValue(mockConversation);

      const result = await service.getConversation('conv-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('conv-1');
      expect(result.messages).toHaveLength(2);
      expect(result.document).toBeDefined();
      expect(result.document.filename).toBe('test.pdf');
      expect(mockPrismaService.conversation.findUnique).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          document: { include: { ocrResult: true } },
        },
      });
    });

    it('should throw NotFoundException for non-existent conversation', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);

      await expect(service.getConversation('non-existent')).rejects.toThrow('对话不存在');
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation successfully', async () => {
      mockPrismaService.conversation.delete = jest.fn().mockResolvedValue({
        id: 'conv-1',
      });

      await expect(service.deleteConversation('conv-1')).resolves.not.toThrow();

      expect(mockPrismaService.conversation.delete).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
      });
    });

    it('should delete conversation with userId filter', async () => {
      mockPrismaService.conversation.delete = jest.fn().mockResolvedValue({
        id: 'conv-1',
      });

      await expect(service.deleteConversation('conv-1', 'user-123')).resolves.not.toThrow();

      expect(mockPrismaService.conversation.delete).toHaveBeenCalledWith({
        where: {
          id: 'conv-1',
          userId: 'user-123',
        },
      });
    });

    it('should throw error when conversation not found', async () => {
      mockPrismaService.conversation.delete = jest.fn().mockRejectedValue(new Error('Record not found'));

      await expect(service.deleteConversation('non-existent')).rejects.toThrow();
    });
  });

  describe('chat with document context', () => {
    it('should include document context in chat', async () => {
      mockPrismaService.conversation.create.mockResolvedValueOnce({
        id: 'conv-1',
        userId: 'test-user',
        documentId: 'doc-123',
        title: 'Test',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        filename: 'test.pdf',
        gcsPath: 'gs://bucket/test.pdf',
      });

      mockVisionService.getOcrResult.mockResolvedValue({
        fullText: 'Document content here',
        text: 'Document content here',
        confidence: 0.95,
        pages: [{ text: 'Document content here', confidence: 0.95 }],
      });

      const request: ChatRequestDto = {
        message: 'What does the document say?',
        userId: 'test-user',
        documentId: 'doc-123',
      };

      const response = await service.chat(request);

      expect(response).toBeDefined();
      expect(mockPrismaService.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      });
      expect(mockVisionService.getOcrResult).toHaveBeenCalled();
    });
  });
});
