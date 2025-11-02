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
});
